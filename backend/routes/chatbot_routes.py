from fastapi import APIRouter, Header, HTTPException
"""
    The provided code defines API endpoints for a chatbot service, including functions to retrieve chat
    history and stream chatbot responses using Server-Sent Events (SSE).
    
    :param authorization: The `authorization` parameter is used to authenticate the user making the
    request. It is typically passed in the headers of the HTTP request as a Bearer token. This token is
    used to identify and authorize the user before accessing certain endpoints or resources
    :type authorization: Optional[str]
    :return: The code defines an API router for a chatbot functionality with endpoints for retrieving
    chat history and streaming chatbot responses using Server-Sent Events (SSE).
    """
from fastapi.responses import StreamingResponse
from typing import Optional

from backend.utils.supabase import get_supabase
from backend.utils.llm import get_gemini_llm
# supabase = get_supabase()
# llm = get_gemini_llm()
from models.chatbot.semantic_search import semantic_search
from models.chatbot.rag_prompt import build_rag_prompt
from datetime import datetime
router = APIRouter(prefix="/chat", tags=["Chatbot"])


# =====================================================
# 🔐 Auth helper
# =====================================================
def get_user_from_authorization(authorization: Optional[str]) -> str:
    supabase= get_supabase()
    print("Authorization header:", authorization)
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization format")

    access_token = authorization.replace("Bearer ", "").strip()
    user_response = supabase.auth.get_user(access_token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return str(user_response.user.id)


# For SSE (EventSource)
def get_user_from_query_token(token: str) -> str:
    supabase= get_supabase()
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return str(user_response.user.id)
# =====================================================
# 📜 Chat history
# =====================================================
@router.get("/history")
def get_chat_history(
    limit: int = 10,
    authorization: Optional[str] = Header(None),
):
    supabase= get_supabase()
    user_id = get_user_from_authorization(authorization)

    response = (
        supabase
        .table("chatbot_history")
        .select("query, response, timestamp")
        .eq("user_id", user_id)
        .order("timestamp", desc=True)
        .limit(limit)
        .execute()
    )

    return response.data[::-1] if response.data else []


# =====================================================
# 💬 Chatbot streaming (SSE)
# =====================================================
@router.get("/stream")
async def chatbot_stream(
    query: str,
    token: str,  # ✅ token via query param
):
    supabase= get_supabase()
    llm = get_gemini_llm()
    user_id = get_user_from_query_token(token)

    # 1️⃣ Semantic search (RAG)
    retrieved_docs = semantic_search(
        query=query,
        collection_name="document_embeddings",
        top_k=5,
        score_threshold=0.4,
    )
    print("Retrieved docs:", retrieved_docs)
    # 2️⃣ Build RAG prompt
    prompt = build_rag_prompt(query, retrieved_docs)
    print("Built prompt:", prompt)
    async def event_generator():
        full_response = ""

        # 3️⃣ Stream Gemini tokens
        async for token in llm.stream(prompt):
            full_response += token
            yield f"data:{token}\n\n"

        # 4️⃣ Save chat after streaming ends
        supabase.table("chatbot_history").insert(
            {
                "user_id": user_id,
                "query": query,
                "response": full_response,
                "timestamp": datetime.now().isoformat(),
            }
        ).execute()

        # Optional explicit end event
        yield "event: done\ndata: end\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
