import json
import re
from pathlib import Path
import pandas as pd
import numpy as np
from tqdm import tqdm

print("⚡ Importing sentence_transformers...")
from sentence_transformers import SentenceTransformer
print("⚡ Importing faiss...")
import faiss

# =========================================================
# CONFIG
# =========================================================
DATA_DIR = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\models\training_data\split\example"
VECTOR_DIR = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\models\chatbot"

INDEX_PATH = f"{VECTOR_DIR}/faiss.index"
META_PATH = f"{VECTOR_DIR}/metadata.json"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 50

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

Path(VECTOR_DIR).mkdir(exist_ok=True)

# =========================================================
# UTILS
# =========================================================
def clean_text(text):
    text = re.sub(r"\s+", " ", str(text))
    return text.strip()


def chunk_text(text):
    words = text.split()
    chunks = []

    step = CHUNK_SIZE - CHUNK_OVERLAP
    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + CHUNK_SIZE])
        if len(chunk) > 50:
            chunks.append(chunk)

    return chunks


# =========================================================
# LOADERS
# =========================================================
def load_txt(path):
    with open(path, "r", encoding="utf-8") as f:
        text = clean_text(f.read())
    return [{"text": text, "source": path.name}]


def load_csv(path):
    df = pd.read_csv(path)
    records = []

    for _, row in df.iterrows():
        combined = " ".join(str(v) for v in row.values if pd.notna(v))
        records.append({
            "text": clean_text(combined),
            "source": path.name
        })

    return records


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = []

    if isinstance(data, list):
        for item in data:
            records.append({
                "text": clean_text(json.dumps(item)),
                "source": path.name
            })
    else:
        records.append({
            "text": clean_text(json.dumps(data)),
            "source": path.name
        })

    return records


# =========================================================
# MAIN PIPELINE (ONE FILE AT A TIME)
# =========================================================
def main():
    print("\n🚀 Starting incremental embedding pipeline\n")

    # -------- LOAD / INIT FAISS --------
    print("📦 Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    if Path(INDEX_PATH).exists():
        index = faiss.read_index(INDEX_PATH)
        print("🔁 Existing FAISS index loaded")
    else:
        index = None
        print("🆕 New FAISS index will be created")

    # -------- LOAD EXISTING METADATA --------
    if Path(META_PATH).exists():
        with open(META_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        metadata = []

    # -------- PROCESS FILES ONE BY ONE --------
    files = list(Path(DATA_DIR).glob("*"))

    for file in tqdm(files, desc="📂 Processing files", unit="file"):
        print(f"\n➡️ Processing: {file.name}")

        if file.suffix == ".txt":
            docs = load_txt(file)
        elif file.suffix == ".csv":
            docs = load_csv(file)
        elif file.suffix == ".json":
            docs = load_json(file)
        else:
            continue

        texts = []
        file_metadata = []

        for doc in docs:
            chunks = chunk_text(doc["text"])
            for chunk in chunks:
                texts.append(chunk)
                file_metadata.append({
                    "source": doc["source"]
                })

        if not texts:
            print("⚠️ No valid chunks found, skipping")
            continue

        embeddings = model.encode(
            texts,
            show_progress_bar=False,
            batch_size=32,
            convert_to_numpy=True
        ).astype("float32")

        # -------- INIT INDEX IF FIRST TIME --------
        if index is None:
            dim = embeddings.shape[1]
            index = faiss.IndexFlatL2(dim)

        index.add(embeddings)
        metadata.extend(file_metadata)

        print(f"✅ Added {len(embeddings)} vectors from {file.name}")

        # -------- SAVE AFTER EACH FILE --------
        faiss.write_index(index, INDEX_PATH)
        with open(META_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    print("\n🎉 PIPELINE COMPLETE")
    print(f"🔢 Total vectors in index: {index.ntotal}")
    print(f"📦 Index path: {INDEX_PATH}")
    print(f"🗂️ Metadata path: {META_PATH}")


if __name__ == "__main__":
    main()
