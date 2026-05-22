import json
import re
import os
from pathlib import Path
import pandas as pd
import numpy as np
from tqdm import tqdm

# Use locally cached model — prevents huggingface.co DNS lookup on every run
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

print("⚡ Importing sentence_transformers...")
from sentence_transformers import SentenceTransformer
print("⚡ Importing faiss...")
import faiss

# =========================================================
# CONFIG
# =========================================================
DATA_DIR   = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\training_data"
VECTOR_DIR = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\backend\models\chatbot"

INDEX_PATH    = f"{VECTOR_DIR}/faiss_compressed.index"
PARQUET_PATH  = f"{VECTOR_DIR}/chunks.parquet"
META_JSONL    = f"{VECTOR_DIR}/chunks_meta.jsonl"   # crash-safe intermediate
PROCESSED_LOG = f"{VECTOR_DIR}/processed_files.txt" # which files are done

CHUNK_SIZE    = 1000    # words per chunk
CHUNK_OVERLAP = 50      # word overlap between chunks
BATCH_SIZE    = 512     # sentences per encoding batch — larger = faster
CSV_CHUNKSIZE = 50_000  # rows read at a time from large CSVs
LARGE_FILE_MB = 50      # CSVs above this size are streamed in chunks

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

Path(VECTOR_DIR).mkdir(exist_ok=True)


# =========================================================
# TEXT UTILS
# =========================================================
def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text)).strip()


def chunk_text(text: str) -> list:
    words = text.split()
    step = CHUNK_SIZE - CHUNK_OVERLAP
    chunks = []
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + CHUNK_SIZE])
        if len(chunk.split()) >= 10:   # skip near-empty tail chunks
            chunks.append(chunk)
    return chunks


# =========================================================
# LOADERS  — all return (chunks: list[str], sources: list[str])
# =========================================================
def load_txt(path: Path):
    text = clean_text(path.read_text(encoding="utf-8", errors="ignore"))
    chunks = chunk_text(text)
    return chunks, [path.name] * len(chunks)


def load_json(path: Path):
    raw = path.read_text(encoding="utf-8", errors="ignore")
    data = json.loads(raw)
    items = data if isinstance(data, list) else [data]
    chunks, sources = [], []
    for item in tqdm(items, desc="  items", unit="item", leave=False):
        for c in chunk_text(clean_text(json.dumps(item))):
            chunks.append(c)
            sources.append(path.name)
    return chunks, sources


def load_jsonl(path: Path):
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    chunks, sources = [], []
    for line in tqdm(lines, desc="  lines", unit="line", leave=False, unit_scale=True):
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
            for c in chunk_text(clean_text(json.dumps(item))):
                chunks.append(c)
                sources.append(path.name)
        except json.JSONDecodeError:
            continue
    return chunks, sources


def _df_to_chunks(df: pd.DataFrame, name: str):
    rows = (
        df.fillna("")
          .astype(str)
          .agg(" ".join, axis=1)
          .str.replace(r"\s+", " ", regex=True)
          .str.strip()
    )
    chunks, sources = [], []
    for text in rows:
        for c in chunk_text(text):
            chunks.append(c)
            sources.append(name)
    return chunks, sources


def load_csv_small(path: Path):
    df = pd.read_csv(path, on_bad_lines="skip", encoding_errors="ignore")
    return _df_to_chunks(df, path.name)


def iter_csv_large(path: Path):
    """Yields (chunks, sources) one CSV chunk at a time — memory-safe for huge files."""
    try:
        total_rows = sum(1 for _ in open(path, encoding="utf-8", errors="ignore")) - 1
    except Exception:
        total_rows = None

    bar = tqdm(total=total_rows, desc="  rows", unit="row",
               leave=False, unit_scale=True, dynamic_ncols=True)
    for df_chunk in pd.read_csv(path, chunksize=CSV_CHUNKSIZE,
                                 on_bad_lines="skip", encoding_errors="ignore"):
        chunks, sources = _df_to_chunks(df_chunk, path.name)
        bar.update(len(df_chunk))
        yield chunks, sources
    bar.close()


# =========================================================
# ENCODE + ADD TO INDEX
# =========================================================
def encode_and_add(model, index, chunks: list, sources: list):
    """Encode chunks in batches, add to FAISS, append to meta JSONL."""
    if not chunks:
        return index

    all_embs = []
    for i in tqdm(range(0, len(chunks), BATCH_SIZE),
                  desc="  encoding", unit="batch", leave=False, dynamic_ncols=True):
        batch = chunks[i : i + BATCH_SIZE]
        embs = model.encode(
            batch,
            normalize_embeddings=True,   # unit vectors → IndexFlatIP = cosine sim
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        all_embs.append(embs)

    embeddings = np.vstack(all_embs).astype("float32")

    if index is None:
        index = faiss.IndexFlatIP(embeddings.shape[1])

    index.add(embeddings)

    with open(META_JSONL, "a", encoding="utf-8") as f:
        for text, src in zip(chunks, sources):
            f.write(json.dumps({"text": text, "source": src}) + "\n")

    return index


def save_index(index):
    faiss.write_index(index, INDEX_PATH)


def mark_processed(name: str):
    with open(PROCESSED_LOG, "a", encoding="utf-8") as f:
        f.write(name + "\n")


# =========================================================
# MAIN
# =========================================================
def main():
    print("\n" + "=" * 60)
    print("  🚀  PharmaLens FAISS Index Builder")
    print("=" * 60 + "\n")

    # ── Model ──────────────────────────────────────────────────
    print("📦 Loading embedding model …")
    model = SentenceTransformer(EMBEDDING_MODEL)
    print("✅ Model ready\n")

    # ── FAISS index ────────────────────────────────────────────
    if Path(INDEX_PATH).exists():
        index = faiss.read_index(INDEX_PATH)
        print(f"🔁 Resumed FAISS index  ({index.ntotal:,} vectors already stored)\n")
    else:
        index = None
        print("🆕 No existing index — will create fresh\n")

    # ── Crash recovery ─────────────────────────────────────────
    processed = set()
    if Path(PROCESSED_LOG).exists():
        processed = set(Path(PROCESSED_LOG).read_text(encoding="utf-8").splitlines())
        if processed:
            print(f"⏭️  Skipping {len(processed)} already-embedded file(s)\n")

    # ── Discover files ─────────────────────────────────────────
    all_files = [
        f for f in Path(DATA_DIR).glob("*")
        if f.suffix.lower() in {".txt", ".csv", ".json", ".jsonl"}
    ]
    todo = [f for f in all_files if f.name not in processed]

    print(f"📂 Found {len(all_files)} file(s) total  |  {len(todo)} left to embed\n")

    if not todo:
        print("✅ Nothing to do — all files already embedded.")
    else:
        # ── Per-file outer progress bar ────────────────────────
        file_bar = tqdm(todo, desc="📁 Files", unit="file", dynamic_ncols=True)

        for file_path in file_bar:
            size_mb = file_path.stat().st_size / (1024 * 1024)
            file_bar.set_postfix(file=file_path.name, size=f"{size_mb:.1f}MB")

            suffix = file_path.suffix.lower()

            if suffix == ".txt":
                chunks, sources = load_txt(file_path)
                index = encode_and_add(model, index, chunks, sources)
                save_index(index)
                mark_processed(file_path.name)
                tqdm.write(f"✅ {file_path.name}  →  {len(chunks):,} chunks  |  total {index.ntotal:,} vectors")

            elif suffix == ".json":
                chunks, sources = load_json(file_path)
                index = encode_and_add(model, index, chunks, sources)
                save_index(index)
                mark_processed(file_path.name)
                tqdm.write(f"✅ {file_path.name}  →  {len(chunks):,} chunks  |  total {index.ntotal:,} vectors")

            elif suffix == ".jsonl":
                chunks, sources = load_jsonl(file_path)
                index = encode_and_add(model, index, chunks, sources)
                save_index(index)
                mark_processed(file_path.name)
                tqdm.write(f"✅ {file_path.name}  →  {len(chunks):,} chunks  |  total {index.ntotal:,} vectors")

            elif suffix == ".csv":
                if size_mb <= LARGE_FILE_MB:
                    chunks, sources = load_csv_small(file_path)
                    index = encode_and_add(model, index, chunks, sources)
                    save_index(index)
                    mark_processed(file_path.name)
                    tqdm.write(f"✅ {file_path.name}  →  {len(chunks):,} chunks  |  total {index.ntotal:,} vectors")
                else:
                    # Stream large CSV in batches, save every batch
                    total_chunks = 0
                    for batch_chunks, batch_sources in iter_csv_large(file_path):
                        index = encode_and_add(model, index, batch_chunks, batch_sources)
                        save_index(index)   # save after each CSV chunk
                        total_chunks += len(batch_chunks)
                    mark_processed(file_path.name)
                    tqdm.write(f"✅ {file_path.name}  →  {total_chunks:,} chunks  |  total {index.ntotal:,} vectors")

        file_bar.close()

    # ── Convert meta JSONL → parquet ───────────────────────────
    if Path(META_JSONL).exists():
        print("\n🔄 Converting metadata → chunks.parquet …")
        df = pd.read_json(META_JSONL, lines=True)
        df.to_parquet(PARQUET_PATH, index=False, compression="snappy")
        print(f"✅ Saved {len(df):,} rows  →  {PARQUET_PATH}")
    else:
        print("\n⚠️  No metadata JSONL found — parquet not written.")

    # ── Summary ────────────────────────────────────────────────
    total = index.ntotal if index else 0
    print("\n" + "=" * 60)
    print(f"  🎉  DONE")
    print(f"  🔢  Total vectors : {total:,}")
    print(f"  📦  FAISS index   : {INDEX_PATH}")
    print(f"  🗂️   Parquet       : {PARQUET_PATH}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
