"""
Local Drug Interaction Checker Test

Uses the real build_gemini_payload + explain_interaction_with_gemini workflow.
FAISS is bypassed so only the DuckDB parquet files are queried — no FAISS index
or Qdrant required.

Edit DRUG_GROUPS below to add/remove drug combinations. Each entry is a list
of drug names; all pairwise combinations within the group are tested.

Usage:
    python test_drug_interaction.py

Run from: backend/
Results:  backend/results/drug_interaction_<timestamp>.csv

Note: First DuckDB query scans ~290 MB of parquet (mild + moderate + severe).
      Expect 10–30 s on first run; subsequent queries use the OS file cache.
"""

import sys
import csv
import time
from itertools import combinations
from pathlib import Path
from datetime import datetime
from unittest.mock import patch
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv(Path(__file__).parent / ".env")
sys.path.insert(0, str(Path(__file__).parent.parent))

# ══════════════════════════════════════════════════════════════════════════════
# Drug groups to test — organised by interaction mechanism
# Each list is one group; all pairwise combos within it are tested.
# Add/remove groups freely. 3-item groups → 3 pairs; 4-item → 6 pairs.
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. BLEEDING RISK ──────────────────────────────────────────────────────────
BLEEDING_RISK = [
    ["warfarin", "aspirin"],
    ["warfarin", "ibuprofen"],
    ["warfarin", "naproxen"],
    ["warfarin", "fluconazole"],
    ["warfarin", "metronidazole"],
    ["dabigatran", "aspirin"],
    ["rivaroxaban", "naproxen"],
    ["apixaban", "clopidogrel"],
    ["clopidogrel", "omeprazole"],
    ["heparin", "ketorolac"],
    ["aspirin", "sertraline"],
    ["warfarin", "amiodarone"],
    ["enoxaparin", "aspirin"],
    ["ticagrelor", "aspirin"],
]

# ── 2. SEROTONIN SYNDROME ─────────────────────────────────────────────────────
SEROTONIN_SYNDROME = [
    ["sertraline", "tramadol"],
    ["fluoxetine", "tramadol"],
    ["linezolid", "sertraline"],
    ["linezolid", "venlafaxine"],
    ["phenelzine", "fluoxetine"],
    ["phenelzine", "meperidine"],
    ["selegiline", "sertraline"],
    ["fentanyl", "escitalopram"],
    ["dextromethorphan", "fluoxetine"],
    ["lithium", "sertraline"],
    ["triptans", "ssris"],
    ["methylene_blue", "venlafaxine"],
    ["tramadol", "mirtazapine"],
]

# ── 3. QT PROLONGATION ───────────────────────────────────────────────────────
QT_PROLONGATION = [
    ["amiodarone", "haloperidol"],
    ["ciprofloxacin", "azithromycin"],
    ["methadone", "fluconazole"],
    ["ondansetron", "haloperidol"],
    ["quetiapine", "azithromycin"],
    ["amiodarone", "sotalol"],
    ["erythromycin", "quetiapine"],
    ["chlorpromazine", "methadone"],
    ["citalopram", "ondansetron"],
    ["hydroxychloroquine", "azithromycin"],
    ["domperidone", "ketoconazole"],
    ["clarithromycin", "quetiapine"],
]

# ── 4. CYP450 METABOLIC INTERACTIONS ─────────────────────────────────────────
CYP_INHIBITION = [
    ["clarithromycin", "simvastatin"],
    ["fluconazole", "midazolam"],
    ["ketoconazole", "atorvastatin"],
    ["rifampicin", "warfarin"],
    ["carbamazepine", "oral_contraceptive"],
    ["phenytoin", "warfarin"],
    ["fluoxetine", "codeine"],
    ["bupropion", "tamoxifen"],
    ["gemfibrozil", "simvastatin"],
    ["St_Johns_Wort", "ciclosporin"],
    ["verapamil", "digoxin"],
    ["amiodarone", "simvastatin"],
]

# ── 5. CNS & RESPIRATORY DEPRESSION ──────────────────────────────────────────
CNS_DEPRESSION = [
    ["oxycodone", "alprazolam"],
    ["morphine", "diazepam"],
    ["fentanyl", "clonazepam"],
    ["methadone", "diazepam"],
    ["alcohol", "zolpidem"],
    ["gabapentin", "hydrocodone"],
    ["pregabalin", "oxycodone"],
    ["clonidine", "lorazepam"],
    ["quetiapine", "opioids"],
    ["baclofen", "morphine"],
    ["carisoprodol", "alprazolam"],
]

# ── 6. HYPOGLYCEMIA ───────────────────────────────────────────────────────────
HYPOGLYCEMIA = [
    ["glibenclamide", "fluconazole"],
    ["insulin", "alcohol"],
    ["metformin", "contrast_dye"],
    ["glipizide", "ciprofloxacin"],
    ["insulin", "beta_blocker"],
    ["glibenclamide", "trimethoprim"],
    ["repaglinide", "gemfibrozil"],
    ["sitagliptin", "insulin"],
]

# ── 7. NEPHROTOXICITY ────────────────────────────────────────────────────────
NEPHROTOXICITY = [
    ["gentamicin", "furosemide"],
    ["ibuprofen", "ACE_inhibitor"],
    ["ciclosporin", "gentamicin"],
    ["methotrexate", "ibuprofen"],
    ["vancomycin", "gentamicin"],
    ["tenofovir", "ibuprofen"],
    ["lithium", "ibuprofen"],
    ["ciclosporin", "tacrolimus"],
]

# ── 8. HYPERKALEMIA ───────────────────────────────────────────────────────────
HYPERKALEMIA = [
    ["lisinopril", "spironolactone"],
    ["losartan", "eplerenone"],
    ["enalapril", "trimethoprim"],
    ["spironolactone", "potassium_supplement"],
    ["tacrolimus", "enalapril"],
]

# ── 9. HYPERTENSIVE CRISIS ───────────────────────────────────────────────────
HYPERTENSIVE_CRISIS = [
    ["phenelzine", "pseudoephedrine"],
    ["tranylcypromine", "ephedrine"],
    ["selegiline", "tyramine_rich_food"],
    ["phenelzine", "dopamine"],
    ["moclobemide", "pseudoephedrine"],
]

# ── 10. CARDIOVASCULAR ───────────────────────────────────────────────────────
CARDIOVASCULAR = [
    ["digoxin", "amiodarone"],
    ["metoprolol", "verapamil"],
    ["sildenafil", "nitrates"],
    ["clonidine", "beta_blocker"],
    ["digoxin", "clarithromycin"],
    ["amlodipine", "simvastatin"],
    ["ivabradine", "verapamil"],
]

# ── 11. HEPATOTOXICITY ───────────────────────────────────────────────────────
HEPATOTOXICITY = [
    ["isoniazid", "rifampicin"],
    ["methotrexate", "alcohol"],
    ["valproate", "carbamazepine"],
    ["statins", "niacin"],
]

# ── 12. EDGE CASES: 3- and 4-drug groups ─────────────────────────────────────
EDGE_CASES = [
    ["warfarin", "aspirin", "fluconazole"],
    ["sertraline", "tramadol", "linezolid"],
    ["ramipril", "furosemide", "ibuprofen"],
    ["amiodarone", "haloperidol", "ciprofloxacin"],
    ["oxycodone", "alprazolam", "gabapentin"],
    ["lisinopril", "spironolactone", "trimethoprim", "potassium_supplement"],
]

# ── MASTER COLLECTION — (category, drugs) tuples ─────────────────────────────
DRUG_GROUPS = (
    [("BLEEDING_RISK",       g) for g in BLEEDING_RISK]
    + [("SEROTONIN_SYNDROME", g) for g in SEROTONIN_SYNDROME]
    + [("QT_PROLONGATION",    g) for g in QT_PROLONGATION]
    + [("CYP_INHIBITION",     g) for g in CYP_INHIBITION]
    + [("CNS_DEPRESSION",     g) for g in CNS_DEPRESSION]
    + [("HYPOGLYCEMIA",       g) for g in HYPOGLYCEMIA]
    + [("NEPHROTOXICITY",     g) for g in NEPHROTOXICITY]
    + [("HYPERKALEMIA",       g) for g in HYPERKALEMIA]
    + [("HYPERTENSIVE_CRISIS",g) for g in HYPERTENSIVE_CRISIS]
    + [("CARDIOVASCULAR",     g) for g in CARDIOVASCULAR]
    + [("HEPATOTOXICITY",     g) for g in HEPATOTOXICITY]
    + [("EDGE_CASES",         g) for g in EDGE_CASES]
)

# ── Imports from original code — not modified ──────────────────────────────────
from backend.models.drug_interaction_checker.drug_iteraction import (
    build_gemini_payload,
    check_drug_interactions_duckdb,
)
from backend.models.drug_interaction_checker.gemini_checking import (
    explain_interaction_with_gemini,
)

# ── Config ─────────────────────────────────────────────────────────────────────
RESULTS_DIR = Path(__file__).parent / "results"

CSV_COLS = [
    "category", "drug_group", "pair", "data_source",
    "duckdb_rows_found", "severity_mild", "severity_moderate", "severity_severe",
    "short_answer", "long_answer", "confidence",
    "gemini_time_s", "total_time_s",
]

# ── Helpers ────────────────────────────────────────────────────────────────────
def sep(char="─", w=72): print(char * w)
def hdr(t): sep("═"); print(f"  {t}"); sep("═")

def duckdb_stats(drugs: list) -> dict:
    """Query DuckDB for severity breakdown — cheap after first OS cache warm-up."""
    rows = check_drug_interactions_duckdb(drugs)
    counts = {"total": len(rows), "mild": 0, "moderate": 0, "severe": 0}
    for r in rows:
        sev = (r.get("severity") or "").lower()
        if sev in counts:
            counts[sev] += 1
    return counts

# ── Per-group run ──────────────────────────────────────────────────────────────
def run_group(category: str, drugs: list) -> list:
    group_label = " + ".join(d.strip() for d in drugs)
    tqdm.write(f"\n  [{category}]  {group_label}")
    tqdm.write("  " + "─" * 68)

    t_start = time.perf_counter()

    # Bypass FAISS → forces DuckDB path inside build_gemini_payload
    with patch(
        "backend.models.drug_interaction_checker.drug_iteraction.search_drug_interaction_faiss",
        return_value=[],
    ):
        payload = build_gemini_payload(drugs)

    if payload is None:
        tqdm.write("  No interaction data found in DuckDB.")
        elapsed = round(time.perf_counter() - t_start, 3)
        return [
            {
                "category":          category,
                "drug_group":        group_label,
                "pair":              f"{a} + {b}",
                "data_source":       "none",
                "duckdb_rows_found": 0,
                "severity_mild":     0,
                "severity_moderate": 0,
                "severity_severe":   0,
                "short_answer":      "No interaction data found in database.",
                "long_answer":       "",
                "confidence":        "low",
                "gemini_time_s":     0.0,
                "total_time_s":      elapsed,
            }
            for a, b in combinations([d.strip().lower() for d in drugs], 2)
        ]

    # Show payload summary
    for interaction in payload["interactions"]:
        tqdm.write(f"    {interaction['pair']:<30}  source={interaction['source']}  "
                   f"chunks={len(interaction['chunks'])}")

    # Gemini explanation
    t_gem = time.perf_counter()
    ai = explain_interaction_with_gemini(payload)
    gemini_time = round(time.perf_counter() - t_gem, 3)
    total_time  = round(time.perf_counter() - t_start, 3)

    tqdm.write(f"  Confidence : {ai['confidence']}   Gemini: {gemini_time}s   Total: {total_time}s")
    tqdm.write(f"  Short      : {ai['short_answer'][:110]}")

    # Build one CSV row per drug pair
    rows = []
    for interaction in payload["interactions"]:
        pair_drugs = [d.strip() for d in interaction["pair"].split(" + ")]
        stats = duckdb_stats(pair_drugs)
        rows.append({
            "category":          category,
            "drug_group":        group_label,
            "pair":              interaction["pair"],
            "data_source":       interaction["source"],
            "duckdb_rows_found": stats["total"],
            "severity_mild":     stats["mild"],
            "severity_moderate": stats["moderate"],
            "severity_severe":   stats["severe"],
            "short_answer":      ai["short_answer"],
            "long_answer":       ai["long_answer"],
            "confidence":        ai["confidence"],
            "gemini_time_s":     gemini_time,
            "total_time_s":      total_time,
        })

    return rows

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    hdr("Drug Interaction Checker — Local Test (DuckDB + Gemini)")
    print(f"  Groups      : {len(DRUG_GROUPS)}")
    print(f"  Data source : DuckDB parquet  (FAISS bypassed)")
    print(f"  Note        : First DuckDB query may take 10–30 s to scan parquet files")
    print(f"  Note        : ~{len(DRUG_GROUPS)} Gemini calls — results saved incrementally\n")

    RESULTS_DIR.mkdir(exist_ok=True)
    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = RESULTS_DIR / f"drug_interaction_{ts}.csv"

    # Open CSV once and write incrementally so no data is lost on crash
    csv_file   = open(csv_path, "w", newline="", encoding="utf-8")
    writer     = csv.DictWriter(csv_file, fieldnames=CSV_COLS)
    writer.writeheader()
    csv_file.flush()

    all_rows = []
    bar = tqdm(DRUG_GROUPS, desc="Groups", unit="group", dynamic_ncols=True)
    try:
        for category, drugs in bar:
            bar.set_postfix(cat=category, drug=drugs[0])
            rows = run_group(category, drugs)
            writer.writerows(rows)
            csv_file.flush()          # persist to disk after every group
            all_rows.extend(rows)
            time.sleep(0.3)           # gentle pause between Gemini calls
    finally:
        csv_file.close()

    # Console summary
    sep("═")
    print(f"\n  {'Category':<20} {'Pair':<30} {'Source':<18} {'DB Rows':>8}  Conf")
    sep()
    for r in all_rows:
        print(f"  {r['category']:<20} {r['pair']:<30} {r['data_source']:<18} "
              f"{r['duckdb_rows_found']:>8}  {r['confidence']}")

    sep("═")
    found    = sum(1 for r in all_rows if r["data_source"] != "none")
    not_found = sum(1 for r in all_rows if r["data_source"] == "none")
    print(f"\n  Total pairs   : {len(all_rows)}")
    print(f"  Found in DB   : {found}")
    print(f"  Not found     : {not_found}")
    print(f"  CSV saved     → {csv_path}")


if __name__ == "__main__":
    main()
