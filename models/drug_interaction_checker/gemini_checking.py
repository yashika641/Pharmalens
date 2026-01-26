import os
from google import genai
import dotenv
from typing import Dict

# --------------------------------------------------
# Environment & Client Setup
# --------------------------------------------------

dotenv.load_dotenv(
    os.path.join(os.path.dirname(__file__), "../../backend/.env")
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# --------------------------------------------------
# Gemini Response Parsing
# --------------------------------------------------

def parse_gemini_response(text: str) -> Dict[str, str]:
    """
    Parses Gemini output into short + long answers.
    """
    if not text:
        return {
            "short_answer": "AI explanation unavailable.",
            "long_answer": ""
        }

    if "SHORT_ANSWER:" in text and "LONG_ANSWER:" in text:
        short, long = text.split("LONG_ANSWER:", 1)
        return {
            "short_answer": short.replace("SHORT_ANSWER:", "").strip(),
            "long_answer": long.strip()
        }

    # fallback
    sentences = text.replace("\n", " ").split(". ")
    return {
        "short_answer": ". ".join(sentences[:2]).strip() + ".",
        "long_answer": text
    }

# --------------------------------------------------
# Core Gemini Explanation Function
# --------------------------------------------------

def explain_interaction_with_gemini(payload: Dict) -> Dict:
    """
    Uses Gemini ONLY to explain:
    - Statistical summary
    - Deduplicated interaction patterns

    Database + rules engine remains authoritative.
    """

    if not payload:
        return {
            "short_answer": "No clinically significant drug interactions detected.",
            "long_answer": "",
            "confidence": "high"
        }

    summary = payload["summary"]
    unique_rows = payload["unique_interactions"]

    evidence_text = "\n".join(
        f"- Severity: {r['severity']}, PRR range: {r['prr_bucket']}, Reporting frequency: {r['frequency_bucket']}"
        for r in unique_rows
    )

    prompt = f"""
You are a clinical pharmacology assistant.

You are provided with a STATISTICAL INTERACTION SUMMARY
and DEDUPLICATED PHARMACOVIGILANCE EVIDENCE.

The statistical summary is FINAL and MUST NOT be overridden.

----------------------------------
DRUG PAIR:
{payload['drug_pair']}

----------------------------------
STATISTICAL SUMMARY (AUTHORITATIVE):
- Overall severity: {summary['data_severity']}
- Evidence count: {summary['evidence_count']}
- Risk level: {summary['risk_level']}
- Signal density: {summary['signal_density']}
- PRR (severity-weighted mean): {summary['prr_weighted_mean']}

----------------------------------
UNIQUE INTERACTION PATTERNS:
{evidence_text}

----------------------------------
RULES:
- Do NOT provide diagnosis or dosage advice
- Do NOT contradict the risk level
- Explain WHY this interaction is risky or safe

TASKS:
1. Provide a SHORT patient-safe explanation (1–2 sentences)
2. Provide a LONG clinical explanation for healthcare professionals

FORMAT EXACTLY:

SHORT_ANSWER:
<patient-safe explanation>

LONG_ANSWER:
<clinical explanation>
"""

    try:
        response = client.models.generate_content(
            model="models/gemini-flash-latest",
            contents=prompt
        )

        parsed = parse_gemini_response(response.text or "")

        return {
            "short_answer": parsed["short_answer"],
            "long_answer": parsed["long_answer"],
            "confidence": "medium"
        }

    except Exception as e:
        return {
            "short_answer": "AI explanation unavailable due to a temporary issue.",
            "long_answer": "",
            "confidence": "low"
        }

# --------------------------------------------------
# Local Test
# --------------------------------------------------

if __name__ == "__main__":

    drugs = ["warfarin", "aspirin"]

    interactions = [
        {
            "drug_a": "warfarin",
            "drug_b": "aspirin",
            "severity": "severe",
            "prr": 12.4
        },
        {
            "drug_a": "aspirin",
            "drug_b": "warfarin",
            "severity": "moderate",
            "prr": 9.1
        }
    ]
    payload = {
    "drug_pair": "warfarin + aspirin",

    "summary": {
        "data_severity": "severe",
        "evidence_count": 4090,
        "risk_level": "High risk interaction – consistent severe safety signal",
        "signal_density": 0.48,
        "prr_weighted_mean": 10.4,
        "prr_mean": 4.0,
        "prr_max": 10.0,
        "severity_consistency": "mixed-but-concerning",
        "mean_reporting_frequency": 0.00151
    },

    "unique_interactions": [
        {
            "severity": "severe",
            "prr_bucket": ">=50",
            "frequency_bucket": "low"
        },
        {
            "severity": "severe",
            "prr_bucket": "10–20",
            "frequency_bucket": "low"
        },
        {
            "severity": "moderate",
            "prr_bucket": "5–10",
            "frequency_bucket": "very_low"
        },
        {
            "severity": "mild",
            "prr_bucket": "<5",
            "frequency_bucket": "low"
        }
    ]
}


    result = explain_interaction_with_gemini(payload)

    print("\n=== ANALYSIS RESULT ===")
    print(result)

    # print("\n=== SHORT SUMMARY ===")
    # print(result["summary"])
