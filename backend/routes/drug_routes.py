from fastapi import APIRouter, HTTPException
from models.drug_interaction_checker.drug_iteraction import build_gemini_payload
from models.drug_interaction_checker.gemini_checking import explain_interaction_with_gemini

router = APIRouter(prefix="/drug-interactions", tags=["Drug Interactions"])

@router.post("/check")
def check_interactions(payload: dict):
    """
    payload = {
      "drugs": ["Aspirin", "Warfarin"]
    }
    """

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