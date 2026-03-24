import os
from typing import List, Dict, Any

# =====================================================
# SINGLETONS (lazy)
# =====================================================
_embedding_model = None
_faiss_index = None
_chunks_df = None
_qdrant_client = None   # ✅ ADDED

FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "/app/faiss_compressed.index")
CHUNKS_PARQUET_PATH = os.getenv("CHUNKS_PARQUET_PATH", "/app/chunks.parquet")

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")   # ✅ ADDED
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)              # ✅ ADDED


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


# ✅ ADDED QDRANT CLIENT
def get_qdrant_client():
    global _qdrant_client

    if _qdrant_client is None:
        from qdrant_client import QdrantClient
        _qdrant_client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )

    return _qdrant_client


# =====================================================
# SEMANTIC SEARCH (FAISS + QDRANT)
# =====================================================
def semantic_search(
    query: str,
    collection_name: str,       # used for Qdrant
    top_k: int = 3,
    score_threshold: float = 0.45,
    max_chunk_length: int = 800,
) -> List[Dict[str, Any]]:  # sourcery skip: low-code-quality

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

    # 2️⃣ FAISS SEARCH (UNCHANGED)
    fetch_k = min(top_k * 10, index.ntotal)
    distances, indices = index.search(query_vector, fetch_k)

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

    # =====================================================
    # 3️⃣ QDRANT SEARCH (ADDED ONLY)
    # =====================================================
    qdrant_results = []
    try:
        client = get_qdrant_client()

        hits = client.search(
            collection_name=collection_name,
            query_vector=query_vector[0].tolist(),
            limit=top_k * 10,
            with_payload=True,
        )

        for hit in hits:
            if hit.score < score_threshold:
                continue

            payload = hit.payload or {}
            text = str(payload.get("text", payload.get("chunk", "")))

            if len(text) > max_chunk_length:
                text = f"{text[:max_chunk_length]}..."

            payload["text"] = text

            qdrant_results.append({
                "id": hit.id,
                "score": float(hit.score),
                "payload": payload,
            })

    except Exception as e:
        print(f"Qdrant search failed: {e}")

    # =====================================================
    # 4️⃣ MERGE RESULTS (ADDED ONLY)
    # =====================================================
    combined_results = results + qdrant_results

    # simple deduplication based on text
    seen = set()
    final_results = []
    for r in combined_results:
        key = r["payload"].get("text", "")[:100]
        if key in seen:
            continue
        seen.add(key)
        final_results.append(r)

    # sort by score
    final_results = sorted(final_results, key=lambda x: x["score"], reverse=True)

    return final_results[:top_k]


# =====================================================
# LOCAL TEST
# =====================================================
if __name__ == "__main__":
    test_query = "Who made this website?"

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