from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from backend.utils.supabase import get_supabase
from backend.models.drug_interaction_checker.drug_iteraction import build_gemini_payload
from backend.models.drug_interaction_checker.gemini_checking import explain_interaction_with_gemini

router = APIRouter(prefix="/drug-interactions", tags=["Drug Interactions"])

@router.post("/check")
def check_interactions(payload: dict, authorization: Optional[str] = Header(None)):
    """
    payload = {
      "drugs": ["Aspirin", "Warfarin"]
    }
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()
    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    drugs = payload.get("drugs")

    if not drugs or len(drugs) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two drugs are required"
        )

    # 1️⃣ deterministic DB lookup
    summary = build_gemini_payload(drugs)
    print("DB interactions found:", summary)

    if not summary:
        raise HTTPException(
            status_code=400,
            detail="No drug interaction data found"
        )

    # 2️⃣ AI validation layer
    ai_analysis = explain_interaction_with_gemini(summary)
    print("AI analysis:", ai_analysis)
    # 2️⃣ AI validation layer
    results = {
        "input_drugs": drugs,
        "ai_analysis": ai_analysis,
        "interactions": summary["unique_interactions"]
    }
    print("results:", results)
    return results