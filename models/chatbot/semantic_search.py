import os
from typing import List, Dict, Any
from pathlib import Path

import dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# -------------------------------------------------
# Load environment variables
# -------------------------------------------------
ENV_PATH = Path(__file__).resolve().parents[2] / "backend" / ".env"
dotenv.load_dotenv(ENV_PATH)

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL or not QDRANT_API_KEY:
    raise RuntimeError("❌ QDRANT_URL or QDRANT_API_KEY not found in .env")

# -------------------------------------------------
# Initialize Qdrant client (HTTP)
# -------------------------------------------------
qdrant = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    prefer_grpc=False,
    timeout=30, 
)

# Sanity check
collections = qdrant.get_collections()
print("✅ Qdrant connected. Collections:", [c.name for c in collections.collections])

# -------------------------------------------------
# Load embedding model (singleton)
# -------------------------------------------------
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# -------------------------------------------------
# Semantic search function (CORRECT API)
# -------------------------------------------------
def semantic_search(
    query: str,
    collection_name: str,
    top_k: int = 5,
    score_threshold: float | None = None,
) -> List[Dict[str, Any]]:

    if not query.strip():
        return []

    # 1️⃣ Embed query
    query_vector = embedding_model.encode(
        query,
        normalize_embeddings=True,
    ).tolist()

    # 2️⃣ Query Qdrant (NEW API)
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

# -------------------------------------------------
# Local test
# -------------------------------------------------
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
