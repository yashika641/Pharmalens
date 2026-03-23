import os
from typing import List, Dict, Any

# =====================================================
# SINGLETONS (lazy)
# =====================================================
_embedding_model = None
_faiss_index = None
_chunks_df = None

FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "/app/faiss_compressed.index")
CHUNKS_PARQUET_PATH = os.getenv("CHUNKS_PARQUET_PATH", "/app/chunks.parquet")


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    return _embedding_model


def get_faiss_index():
    global _faiss_index

    if _faiss_index is None:
        import faiss
        _faiss_index = faiss.read_index(FAISS_INDEX_PATH)

    return _faiss_index


def get_chunks_df():
    global _chunks_df

    if _chunks_df is None:
        import pandas as pd
        _chunks_df = pd.read_parquet(CHUNKS_PARQUET_PATH)

    return _chunks_df


# =====================================================
# SEMANTIC SEARCH (drop-in replacement for Qdrant)
# =====================================================
def semantic_search(
    query: str,
    collection_name: str,       # kept for API compatibility, not used
    top_k: int = 3,
    score_threshold: float = 0.45,
    max_chunk_length: int = 800,
) -> List[Dict[str, Any]]:

    if not query or not query.strip():
        return []

    import numpy as np

    model = get_embedding_model()
    index = get_faiss_index()
    df = get_chunks_df()

    # 1️⃣ Embed query
    query_vector = model.encode(
        query,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32").reshape(1, -1)

    # 2️⃣ Search FAISS — get more candidates then filter by threshold
    fetch_k = min(top_k * 10, index.ntotal)
    distances, indices = index.search(query_vector, fetch_k)

    # FAISS inner product on normalized vectors = cosine similarity
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        score = float(dist)
        if score < score_threshold:
            continue

        row = df.iloc[idx]
        text = str(row.get("text", row.get("chunk", "")))
        if len(text) > max_chunk_length:
            text = f"{text[:max_chunk_length]}..."

        payload = {"text": text}
        # include any extra columns as payload
        for col in df.columns:
            if col not in ("text", "chunk"):
                payload[col] = row.get(col, None)

        results.append({
            "id": int(idx),
            "score": score,
            "payload": payload,
        })

        if len(results) >= top_k:
            break

    return results


# =====================================================
# LOCAL TEST
# =====================================================
if __name__ == "__main__":
    test_query = "What are the side effects of ibuprofen?"

    results = semantic_search(
        query=test_query,
        collection_name="document_embeddings",
        top_k=3,
        score_threshold=0.4,
    )

    print("\n🔎 Search Results:")
    for r in results:
        print(f"- ID: {r['id']} | Score: {r['score']:.3f}")
        print(f"  Payload: {r['payload']}\n")