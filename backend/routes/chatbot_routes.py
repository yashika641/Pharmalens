import asyncio

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional

from backend.utils.supabase import get_supabase
from backend.utils.llm import get_gemini_llm
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["Chatbot"])

supabase = get_supabase()
llm = get_gemini_llm()

PHARMA_SYSTEM_PROMPT = """You are PharmaLens AI Pharmacist — a knowledgeable, trustworthy assistant specialising in Indian pharmaceutical products and general medication guidance.

YOUR KNOWLEDGE SCOPE (only answer questions in these areas):
- Indian brand-name medicines and their generic equivalents (e.g. Crocin, Dolo, Augmentin, Metformin, Pantop, etc.)
- Dosage, frequency, and administration of common medicines
- Side effects, contraindications, and precautions
- Drug-drug interactions and drug-food interactions
- Common chronic conditions: Diabetes, Hypertension, Thyroid, Asthma, PCOD, etc.
- Over-the-counter medicines available in India
- Prescription medicine general information (NOT prescribing)
- Safe storage of medicines, expiry interpretation
- Basic first-aid medication guidance
- Indian regulatory context (CDSCO, Schedule H, Schedule H1 drugs)

STRICT RULES:
1. NEVER prescribe or recommend a medicine for a specific patient — always say "consult your doctor or pharmacist".
2. NEVER answer questions outside the pharmaceutical/medication domain. Politely redirect.
3. NEVER make up drug names, dosages, or interactions. If unsure, say so.
4. Always mention side effects and warnings when discussing a specific medicine.
5. Be concise — answer in 2–4 short paragraphs maximum. Use bullet points where helpful.
6. For dangerous/severe interactions or emergencies, always recommend immediate medical attention.
7. Mention the drug category (antibiotic, analgesic, antacid, etc.) when first introducing a medicine.
8. Prefer Indian brand names alongside generic names for clarity (e.g. "Paracetamol — sold as Crocin, Dolo, Calpol in India").

If a question is completely unrelated to medicines or health, respond: "I'm specialised in medication and pharmaceutical queries. Please ask me about medicines, dosages, interactions, or related health topics."
"""


def build_gemini_prompt(query: str) -> str:
    return f"{PHARMA_SYSTEM_PROMPT}\n\n### User Question:\n{query}\n\n### Answer:"
# =====================================================
# 🔐 Auth helper
# =====================================================
def get_user_from_authorization(authorization: Optional[str]) -> str:
    # supabase= get_supabase()
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
    # supabase= get_supabase()
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
    # supabase= get_supabase()
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
    # supabase= get_supabase()
    # llm = get_gemini_llm()
    user_id = get_user_from_query_token(token)

    # Build direct Gemini prompt (no FAISS/RAG)
    prompt = build_gemini_prompt(query)

    async def event_generator():
        full_response = ""

        # 3️⃣ Stream Gemini tokens
        async for chunk in llm.stream(prompt):
            full_response += chunk
            yield f"data:{chunk}\n\n"

        # 4️⃣ Save chat after streaming ends
        asyncio.create_task(
            asyncio.to_thread(
                supabase.table("chatbot_history").insert(
                    {
                        "user_id": user_id,
                        "query": query,
                        "response": full_response,
                        "timestamp": datetime.now().isoformat(),
                    }
                ).execute
            )
        )

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
