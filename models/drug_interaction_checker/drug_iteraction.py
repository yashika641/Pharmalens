import duckdb
from itertools import combinations

PARQUET_PATH = "backend/data/drug_interactions/**/*.parquet"

# ✅ In-memory DuckDB used only as a query engine
_con = duckdb.connect(database=":memory:")

def check_drug_interactions(drugs: list[str]) -> list[dict]:
    drugs = [d.strip().lower() for d in drugs if d.strip()]
    results = []

    if len(drugs) < 2:
        return results

    for drug_a, drug_b in combinations(drugs, 2):
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
         OR (drug_a = ? AND drug_b = ?)
        """

        rows = _con.execute(
            query,
            [PARQUET_PATH, drug_a, drug_b, drug_b, drug_a]
        ).fetchall()

        for r in rows:
            results.append({
                "drug_a": r[0],
                "drug_b": r[1],
                "severity": r[2],
                "prr": r[3],
                "prr_error": r[4],
                "mean_reporting_frequency": r[5],
            })

    return results
