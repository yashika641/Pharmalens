import os
from typing import List, Dict, Any, Optional

# =====================================================
# SINGLETONS (lazy)
# =====================================================
_qdrant = None
_embedding_model = None


def get_qdrant_client():
    global _qdrant

    if _qdrant is None:
        from qdrant_client import QdrantClient

        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")

        if not url or not api_key:
            raise RuntimeError("QDRANT_URL or QDRANT_API_KEY not set")

        _qdrant = QdrantClient(
            url=url,
            api_key=api_key,
            prefer_grpc=False,
            timeout=30,
        )

    return _qdrant


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    return _embedding_model


# =====================================================
# SEMANTIC SEARCH (lazy + safe)
# =====================================================
def semantic_search(
    query: str,
    collection_name: str,
    top_k: int = 5,
    score_threshold: Optional[float] = None,
) -> List[Dict[str, Any]]:

    if not query or not query.strip():
        return []

    qdrant = get_qdrant_client()
    model = get_embedding_model()

    # 1️⃣ Embed query
    query_vector = model.encode(
        query,
        normalize_embeddings=True,
    ).tolist()

    # 2️⃣ Query Qdrant
    results = qdrant.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=top_k,
        score_threshold=score_threshold,
    )

    # 3️⃣ Format response
    return [
        {
            "id": point.id,
            "score": point.score,
            "payload": point.payload,
        }
        for point in results.points
    ]


# =====================================================
# LOCAL TEST (SAFE)
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
