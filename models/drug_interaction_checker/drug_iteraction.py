import duckdb
import statistics
from itertools import combinations
from typing import List, Dict, Optional
from collections import Counter

# -------------------------------
# Configuration
# -------------------------------

PARQUET_PATH = (
    "models/drug_interaction_checker/parquet/"
    "drug_interactions/**/*.parquet"
)

# In-memory DuckDB (query engine only)
_con = duckdb.connect(database=":memory:")


# -------------------------------
# Core Query Layer
# -------------------------------

def check_drug_interactions(drugs: List[str]) -> List[Dict]:
    """
    Fetch raw pharmacovigilance interaction signals
    for all drug pairs from parquet data.
    """
    drugs = [d.strip().lower() for d in drugs if d.strip()]
    results: List[Dict] = []

    if len(drugs) < 2:
        return results

    query = """
        SELECT
            drug_a,
            drug_b,
            severity,
            prr,
            prr_error,
            mean_reporting_frequency
        FROM read_parquet(?)
        WHERE
            (drug_a = ? AND drug_b = ?)
        OR  (drug_a = ? AND drug_b = ?)
    """

    for drug_a, drug_b in combinations(drugs, 2):
        rows = _con.execute(
            query,
            [PARQUET_PATH, drug_a, drug_b, drug_b, drug_a]
        ).fetchall()

        for r in rows:
            results.append(
                {
                    "drug_a": r[0],
                    "drug_b": r[1],
                    "severity": r[2],
                    "prr": r[3],
                    "prr_error": r[4],
                    "mean_reporting_frequency": r[5],
                }
            )

    return results

def prr_bucket(prr: float) -> str:
    if prr >= 50:
        return ">=50"
    elif prr >= 20:
        return "20–50"
    elif prr >= 10:
        return "10–20"
    elif prr >= 5:
        return "5–10"
    else:
        return "<5"

def freq_bucket(freq: float) -> str:
    if freq < 0.0001:
        return "very_low"
    elif freq < 0.001:
        return "low"
    else:
        return "medium"

def dedupe_raw_results_for_gemini(raw_rows: list[dict]) -> list[dict]:
    seen = {}
    for r in raw_rows:
        key = (
            tuple(sorted([r["drug_a"], r["drug_b"]])),
            r["severity"],
            prr_bucket(r["prr"]),
            freq_bucket(r["mean_reporting_frequency"]),
        )
        if key not in seen:
            seen[key] = {
                "drug_a": r["drug_a"],
                "drug_b": r["drug_b"],
                "severity": r["severity"],
                "prr_bucket": prr_bucket(r["prr"]),
                "example_prr": r["prr"],
                "frequency_bucket": freq_bucket(r["mean_reporting_frequency"]),
            }
    return list(seen.values())

# -------------------------------
# Aggregation & Interpretation
# -------------------------------

def aggregate_severity(results: List[Dict]) -> str:
    counts = Counter(r["severity"] for r in results)
    total = sum(counts.values())

    severe_ratio = counts.get("severe", 0) / total
    moderate_ratio = counts.get("moderate", 0) / total

    if severe_ratio >= 0.05:
        return "severe"
    if moderate_ratio >= 0.10:
        return "moderate"
    return "mild"



def summarize_interactions(raw_results: List[Dict]) -> Optional[Dict]:
    if not raw_results:
        return None

    severity_weight = {
        "mild": 1,
        "moderate": 2,
        "severe": 3
    }

    # ✅ STABILIZE PRR
    prrs = [cap_prr(r["prr"]) for r in raw_results]
    freqs = [r["mean_reporting_frequency"] for r in raw_results]
    severities = [r["severity"] for r in raw_results]

    weighted_prrs = [
        cap_prr(r["prr"]) * severity_weight[r["severity"]]
        for r in raw_results
    ]

    prr_mean = statistics.mean(prrs)
    prr_max = max(prrs)
    prr_weighted_mean = statistics.mean(weighted_prrs)

    evidence_count = len(raw_results)

    # ✅ SIGNAL DENSITY
    signal_density = sum(
        1 for p in prrs if p >= 3
    ) / evidence_count

    # ✅ DOMINANCE ONLY MEANINGFUL FOR SMALL DATASETS
    dominance_ratio = (
        prr_max / prr_mean if prr_mean > 0 else prr_max
    )
    dominance_valid = (
        prr_max >= 5 and
        dominance_ratio >= 2 and
        evidence_count <= 1000
    )

    # Severity consistency (informational)
    severity_set = set(severities)
    if len(severity_set) == 1:
        consistency = "high"
    elif "severe" in severity_set:
        consistency = "mixed-but-concerning"
    else:
        consistency = "low"

    return {
        "drug_pair": f"{raw_results[0]['drug_a']} + {raw_results[0]['drug_b']}",
        "data_severity": aggregate_severity(raw_results),
        "evidence_count": evidence_count,

        "prr_mean": round(prr_mean, 2),
        "prr_max": round(prr_max, 2),
        "prr_weighted_mean": round(prr_weighted_mean, 2),
        "dominance_ratio": round(dominance_ratio, 2),
        "dominance_valid": dominance_valid,

        "signal_density": round(signal_density, 3),
        "severity_consistency": consistency,
        "mean_reporting_frequency": round(statistics.mean(freqs), 6),
    }

def cap_prr(prr: float, cap: float = 10.0) -> float:
    return min(prr, cap)

def interpret_risk(summary: Dict) -> str:
    severity = summary["data_severity"]
    weighted_prr = summary["prr_weighted_mean"]
    density = summary["signal_density"]
    evidence = summary["evidence_count"]
    dominance_valid = summary["dominance_valid"]

    # 🔴 TRUE HIGH RISK
    if severity == "severe" and density >= 0.05:
        return "High risk interaction – consistent severe safety signal"

    # 🟠 MODERATE–HIGH
    if weighted_prr >= 5 and density >= 0.03:
        return "Moderate to high risk – clinically relevant interaction"

    # 🟡 MODERATE
    if weighted_prr >= 3 and density >= 0.01:
        return "Moderate risk interaction – caution advised"

    # 🟢 LOW
    return "Low risk interaction – limited clinical concern"

def run_test_case(name: str, raw_results: List[Dict]):
    raw_results=check_drug_interactions(name.split())
    print(raw_results)
    print(f"\n=== {name} ===")
    summary = summarize_interactions(raw_results)
    if summary:
        summary["risk_level"] = interpret_risk(summary)
    print(summary)

def build_gemini_payload(drugs: List[str]) -> Optional[Dict]:
    """
    Final authoritative payload for Gemini.
    Contains:
    1. Statistical summary (ground truth)
    2. Deduplicated interaction patterns (evidence)
    """

    raw_results = check_drug_interactions(drugs)

    if not raw_results:
        return None

    summary = summarize_interactions(raw_results)
    if not summary:
        return None

    summary["risk_level"] = interpret_risk(summary)

    unique_rows = dedupe_raw_results_for_gemini(raw_results)

    # Strip drug names from unique rows (Gemini already knows the pair)
    cleaned_unique_rows = [
        {
            "severity": r["severity"],
            "prr_bucket": r["prr_bucket"],
            "frequency_bucket": r["frequency_bucket"],
        }
        for r in unique_rows
    ]

    return {
        "drug_pair": summary["drug_pair"],
        "summary": summary,
        "unique_interactions": cleaned_unique_rows,
    }

# -------------------------------
# Example: Local Testing
# -------------------------------

if __name__ == "__main__":
    
    test_cases = {
        # 1️⃣ Classic high-risk bleeding combo
        "Warfarin + Aspirin": ["warfarin", "aspirin"],

        # 2️⃣ NSAID + anticoagulant
        "Warfarin + Ibuprofen": ["warfarin", "ibuprofen"],

        # 3️⃣ Dual antiplatelet therapy
        "Clopidogrel + Aspirin": ["clopidogrel", "aspirin"],

        # 4️⃣ Generally safe metabolic combo
        "Metformin + Atorvastatin": ["metformin", "atorvastatin"],

        # 5️⃣ Common OTC combo
        "Paracetamol + Ibuprofen": ["paracetamol", "ibuprofen"],

        # 6️⃣ Electrolyte-risk cardiovascular combo
        "Lisinopril + Spironolactone": ["lisinopril", "spironolactone"],

        # 7️⃣ Edge case: uncommon / weak interaction
        "Levothyroxine + Vitamin C": ["levothyroxine", "ascorbic acid"],
    }

    for name, drugs in test_cases.items():
        print("\n" + "=" * 80)
        print(f"TEST CASE: {name}")
        print(f"Drugs: {drugs}")

        raw_results = check_drug_interactions(drugs)

        print(f"\nRaw results count: {len(raw_results)}")
        if raw_results:
            # show only first few rows to avoid flooding output
            print("Sample raw rows:", raw_results[:3])
        else:
            print("No interaction signals found in database.")

        summary = summarize_interactions(raw_results)

        if summary:
            summary["risk_level"] = interpret_risk(summary)
            print("\nSummary:")
            for k, v in summary.items():
                print(f"  {k}: {v}")
        else:
            print("\nSummary: No clinically significant interaction detected.")
