import pandas as pd
from pathlib import Path
from tqdm import tqdm

# =====================================================
# CONFIG
# =====================================================
INPUT_CSV = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\training_data\openfda_warnings_dosage_raw.csv"
OUTPUT_DIR = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\training_data"

ROWS_PER_FILE = 50000

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# =====================================================
# SPLIT LOGIC
# =====================================================
def split_csv():
    print("\n🚀 Starting CSV split")
    print(f"📄 Input file: {INPUT_CSV}")
    print(f"📦 Rows per chunk: {ROWS_PER_FILE}\n")

    chunk_iter = pd.read_csv(INPUT_CSV, chunksize=ROWS_PER_FILE)

    for i, chunk in enumerate(
        tqdm(chunk_iter, desc="✂️ Splitting CSV", unit="chunk")
    ):
        output_path = Path(OUTPUT_DIR) / f"chhunk_{i:05d}.csv"
        chunk.to_csv(output_path, index=False)

    print("\n✅ CSV splitting complete")
    print(f"📁 Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    split_csv()
