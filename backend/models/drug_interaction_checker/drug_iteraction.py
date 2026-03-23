import os
from itertools import combinations
from typing import List, Dict, Optional

# =====================================================
# FAISS-based drug interaction search
# =====================================================

def search_drug_interaction_faiss(drug_a: str, drug_b: str, top_k: int = 5) -> List[Dict]:
    """
    Search FAISS index for drug interaction information.
    Uses the combined query: 'Drug A and Drug B interaction'
    """
    from backend.models.chatbot.semantic_search import semantic_search

    query = f"{drug_a} and {drug_b} drug interaction side effects"

    return semantic_search(
        query=query,
        collection_name="document_embeddings",  # kept for API compat
        top_k=top_k,
        score_threshold=0.3,  # slightly lower threshold for drug queries
    )


# =====================================================
# DuckDB fallback (original logic)
# =====================================================

PARQUET_PATH = (
    "models/drug_interaction_checker/parquet/"
    "drug_interactions/**/*.parquet"
)
_con = None


def get_duckdb_connection():
    global _con
    if _con is None:
        import duckdb
        _con = duckdb.connect(database=":memory:")
    return _con


def check_drug_interactions_duckdb(drugs: List[str]) -> List[Dict]:
    """Original DuckDB parquet lookup — used as fallback."""
    _con = get_duckdb_connection()
    drugs = [d.strip().lower() for d in drugs if d.strip()]
    results = []

    if len(drugs) < 2:
        return results

    query = """
        SELECT drug_a, drug_b, severity, prr, prr_error, mean_reporting_frequency
        FROM read_parquet(?)
        WHERE (drug_a = ? AND drug_b = ?) OR (drug_a = ? AND drug_b = ?)
    """

    for drug_a, drug_b in combinations(drugs, 2):
        try:
            rows = _con.execute(
                query,
                [PARQUET_PATH, drug_a, drug_b, drug_b, drug_a]
            ).fetchall()

            results.extend(
                {
                    "drug_a": r[0],
                    "drug_b": r[1],
                    "severity": r[2],
                    "prr": r[3],
                    "prr_error": r[4],
                    "mean_reporting_frequency": r[5],
                }
                for r in rows
            )
        except Exception as e:
            print(f"[DuckDB fallback error] {drug_a} + {drug_b}: {e}")

    return results


# =====================================================
# Main payload builder
# =====================================================

def build_gemini_payload(drugs: List[str]) -> Optional[Dict]:
    """
    Build payload for Gemini explanation.
    1. Try FAISS semantic search first
    2. Fall back to DuckDB parquet if FAISS finds nothing
    """
    if len(drugs) < 2:
        return None

    drugs_clean = [d.strip().lower() for d in drugs if d.strip()]
    all_faiss_results = []
    all_pairs = []

    for drug_a, drug_b in combinations(drugs_clean, 2):
        pair_label = f"{drug_a} + {drug_b}"
        if faiss_results := search_drug_interaction_faiss(
            drug_a, drug_b, top_k=5
        ):
            all_faiss_results.append({
                "pair": pair_label,
                "source": "faiss",
                "chunks": [
                    {
                        "score": r["score"],
                        "text": r["payload"].get("text", ""),
                    }
                    for r in faiss_results
                ]
            })
        else:
            # Fallback to DuckDB
            print(f"[Drug Interaction] FAISS found nothing for {pair_label}, trying DuckDB fallback...")
            if duckdb_results := check_drug_interactions_duckdb(
                [drug_a, drug_b]
            ):
                all_faiss_results.append({
                    "pair": pair_label,
                    "source": "duckdb_fallback",
                    "chunks": [
                        {
                            "score": None,
                            "text": (
                                f"Severity: {r['severity']}, "
                                f"PRR: {r['prr']:.2f}, "
                                f"Reporting frequency: {r['mean_reporting_frequency']:.6f}"
                            ),
                        }
                        for r in duckdb_results[:5]
                    ]
                })
            else:
                all_faiss_results.append({
                    "pair": pair_label,
                    "source": "none",
                    "chunks": []
                })

        all_pairs.append(pair_label)

    if not all_faiss_results:
        return None

    return {
        "drug_pair": " | ".join(all_pairs),
        "interactions": all_faiss_results,
        "unique_interactions": [
            {"text": chunk["text"], "score": chunk["score"]}
            for pair_data in all_faiss_results
            for chunk in pair_data["chunks"]
        ],
    }