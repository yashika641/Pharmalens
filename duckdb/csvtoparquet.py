import duckdb
from tqdm import tqdm

CSV_PATH = r"C:\Users\palya\Desktop\pharmalens\DATA\TWOSIDES_clean.csv"
DB_PATH = "data/pharmalens.duckdb"
CHUNK_SIZE = 500_000  # safe for large files

con = duckdb.connect(DB_PATH)

# Step 1: Count total rows (fast, streaming)
result = con.execute(f"""
    SELECT COUNT(*)
    FROM read_csv_auto('{CSV_PATH}', HEADER=TRUE)
""").fetchone()

if result is None:
    print("❌ Error: Could not read CSV file or query failed")
    con.close()
    exit(1)

total_rows = result[0]

print(f"📊 Total rows: {total_rows:,}")

# Step 2: Create table from schema only
con.execute(f"""
CREATE OR REPLACE TABLE drug_interactions AS
SELECT *
FROM read_csv_auto('{CSV_PATH}', HEADER=TRUE)
LIMIT 0
""")

# Step 3: Load in chunks with progress bar
offset = 0

with tqdm(total=total_rows, unit="rows") as pbar:
    while offset < total_rows:
        con.execute(f"""
        INSERT INTO drug_interactions
        SELECT *
        FROM read_csv_auto('{CSV_PATH}', HEADER=TRUE)
        LIMIT {CHUNK_SIZE} OFFSET {offset}
        """)
        offset += CHUNK_SIZE
        pbar.update(min(CHUNK_SIZE, total_rows - pbar.n))

con.close()

print("✅ CSV fully loaded into DuckDB with progress")
