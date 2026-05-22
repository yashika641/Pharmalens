import duckdb

DB_PATH = "data/pharmalens.duckdb"

def get_interactions(drug_name: str, limit: int = 20):
    """
    Fetch drug–drug interactions for a given drug
    (bidirectional lookup).
    """
    con = duckdb.connect(DB_PATH, read_only=True)

    query = """
    SELECT
        drug_1_concept_name,
        drug_2_concept_name,
        condition_concept_name,
        PRR,
        PRR_error,
        mean_reporting_frequency
    FROM drug_interactions
    WHERE drug_1_concept_name = ?
       OR drug_2_concept_name = ?
    ORDER BY PRR DESC
    LIMIT ?
    """

    results = con.execute(
        query,
        [drug_name, drug_name, limit]
    ).fetchall()

    con.close()
    return results


if __name__ == "__main__":
    drug = "Aspirin"   # change this to test
    interactions = get_interactions(drug)

    print(f"\n🔎 Interactions for {drug}:\n")

    for row in interactions:
        print(
            f"{row[0]} ↔ {row[1]} | "
            f"Condition: {row[2]} | "
            f"PRR: {row[3]:.2f}"
        )
