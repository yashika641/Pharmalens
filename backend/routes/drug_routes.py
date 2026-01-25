from fastapi import APIRouter, HTTPException
from models.drug_interaction_checker.drug_iteraction import check_drug_interactions
from models.drug_interaction_checker.gemini_checking import analyze_drug_conflicts

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
    interactions = check_drug_interactions(drugs)

    # 2️⃣ AI validation layer
    ai_analysis = analyze_drug_conflicts(drugs, interactions)

    return {
        "input_drugs": drugs,
        "interactions": interactions,
        "ai_analysis": ai_analysis
    }
