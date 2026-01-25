import json
import pandas as pd
from tqdm import tqdm

# =========================
# CONFIG
# =========================
INPUT_JSON = "C:\\Users\\palya\\Desktop\\pharmalens\\DATA\\drug labels\\drug-label-0001-of-0013.json"      # path to your JSON file
OUTPUT_CSV = "output.csv"     # final CSV

# =========================
# HELPERS
# =========================
def normalize_value(value):
    """
    Convert JSON values into CSV-safe strings
    """
    if isinstance(value, list):
        return " || ".join(str(v) for v in value)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    return value


def flatten_record(record):
    """
    Flattens one 'results' record into a single flat dict
    """
    flat = {}

    for key, value in record.items():

        # Handle nested openfda separately
        if key == "openfda" and isinstance(value, dict):
            for sub_key, sub_val in value.items():
                flat[f"openfda_{sub_key}"] = normalize_value(sub_val)

        else:
            flat[key] = normalize_value(value)

    return flat


# =========================
# MAIN PROCESS
# =========================
rows = []

with open(INPUT_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

results = data.get("results", [])

for item in tqdm(results, desc="Extracting records"):
    rows.append(flatten_record(item))

# =========================
# WRITE CSV
# =========================
df = pd.DataFrame(rows)
df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

print("✅ Extraction complete")
print(f"📄 CSV saved to: {OUTPUT_CSV}")
print(f"🧮 Total records: {len(df)}")
