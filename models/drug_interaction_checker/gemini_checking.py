import os
from google import genai
import dotenv

# Load .env
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "../../backend/.env"))

# Create Gemini client (NEW SDK)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("Gemini API Key Loaded:", os.getenv("GEMINI_API_KEY") is not None)

def analyze_drug_conflicts(drugs: list[str], interactions: list[dict]) -> dict:
    """
    Uses Gemini to analyze drug conflicts & risks.
    Advisory only – never overrides database severity.
    """

    if not interactions:
        return {
            "summary": "No known clinically significant interactions found.",
            "confidence": "high"
        }

    interaction_text = "\n".join(
        f"{i['drug_a']} + {i['drug_b']} → {i['severity']} (PRR={i['prr']})"
        for i in interactions
    )

    prompt = f"""
You are a clinical pharmacology assistant.

Drugs taken together:
{", ".join(drugs)}

Known interaction signals:
{interaction_text}

Tasks:
1. Confirm whether these interactions are clinically meaningful.
2. Mention additional risks (bleeding, renal, CNS, elderly, etc).
3. Provide a short, clear safety summary (non-diagnostic).
"""

    # ✅ NEW SDK call (THIS IS THE KEY FIX)
    response = client.models.generate_content(
        model="gemini-1.5-pro",
        contents=prompt
    )

    return {
        "summary": response.text.strip() if response.text else "No summary available.",
        "confidence": "medium"
    }
