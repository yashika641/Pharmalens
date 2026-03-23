import os
from typing import Dict, Optional
from google import genai

# ==================================================
# Lazy Gemini Client (singleton)
# ==================================================
_client: Optional[genai.Client] = None


def get_gemini_client() -> genai.Client:
    global _client

    if _client is None:
        if api_key := os.getenv("GEMINI_API_KEY"):
            _client = genai.Client(api_key=api_key)

        else:
            raise RuntimeError("GEMINI_API_KEY not set")

    return _client


# ==================================================
# Gemini Response Parsing (PURE FUNCTION)
# ==================================================
def parse_gemini_response(text: str) -> Dict[str, str]:
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

    sentences = text.replace("\n", " ").split(". ")
    return {
        "short_answer": ". ".join(sentences[:2]).strip() + ".",
        "long_answer": text
    }


# ==================================================
# Build prompt from FAISS chunks
# ==================================================
def _build_faiss_prompt(payload: Dict) -> str:
    drug_pair = payload["drug_pair"]
    interactions = payload.get("interactions", [])

    evidence_text = ""
    for pair_data in interactions:
        pair = pair_data["pair"]
        source = pair_data["source"]
        chunks = pair_data["chunks"]

        if not chunks:
            evidence_text += f"\n### {pair}\nNo data found.\n"
            continue

        chunk_lines = "\n".join(
            f"- {c['text']}" for c in chunks if c.get("text")
        )
        evidence_text += f"\n### {pair} (source: {source})\n{chunk_lines}\n"

    return f"""
You are a clinical pharmacology assistant.

You are provided with DRUG INTERACTION EVIDENCE retrieved from a medical knowledge base.

----------------------------------
DRUG PAIR:
{drug_pair}

----------------------------------
RETRIEVED EVIDENCE:
{evidence_text}

----------------------------------
RULES:
- Do NOT provide diagnosis or dosage advice
- Base your answer ONLY on the evidence provided
- If evidence is weak or limited, say so clearly
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


# ==================================================
# Build prompt from DuckDB fallback (original format)
# ==================================================
def _build_duckdb_prompt(payload: Dict) -> str:
    summary = payload["summary"]
    unique_rows = payload["unique_interactions"]

    evidence_text = "\n".join(
        f"- Severity: {r['severity']}, PRR range: {r['prr_bucket']}, "
        f"Reporting frequency: {r['frequency_bucket']}"
        for r in unique_rows
    )

    return f"""
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


# ==================================================
# Core Gemini Explanation
# ==================================================
def explain_interaction_with_gemini(payload: Dict) -> Dict:
    """
    Works with both FAISS payload and DuckDB fallback payload.
    Detects which format based on payload keys.
    """
    if not payload:
        return {
            "short_answer": "No clinically significant drug interactions detected.",
            "long_answer": "",
            "confidence": "high"
        }

    # FAISS payload has "interactions" key
    # DuckDB payload has "summary" key
    if "interactions" in payload:
        prompt = _build_faiss_prompt(payload)
        confidence = "medium"
    elif "summary" in payload:
        prompt = _build_duckdb_prompt(payload)
        confidence = "medium"
    else:
        return {
            "short_answer": "Unable to process interaction data.",
            "long_answer": "",
            "confidence": "low"
        }

    try:
        client = get_gemini_client()

        response = client.models.generate_content(
            model="models/gemini-flash-latest",
            contents=prompt
        )

        parsed = parse_gemini_response(response.text or "")

        return {
            "short_answer": parsed["short_answer"],
            "long_answer": parsed["long_answer"],
            "confidence": confidence
        }

    except Exception as e:
        print(f"[Gemini error] {e}")
        return {
            "short_answer": "AI explanation unavailable due to a temporary issue.",
            "long_answer": "",
            "confidence": "low"
        }


# ==================================================
# Local Test
# ==================================================
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    faiss_payload = {
        "drug_pair": "warfarin + aspirin",
        "interactions": [
            {
                "pair": "warfarin + aspirin",
                "source": "faiss",
                "chunks": [
                    {"score": 0.87, "text": "Warfarin and aspirin combined significantly increase bleeding risk."},
                    {"score": 0.81, "text": "Concurrent use is associated with increased risk of gastrointestinal hemorrhage."},
                ]
            }
        ],
        "unique_interactions": [
            {"text": "Warfarin and aspirin combined significantly increase bleeding risk.", "score": 0.87},
        ]
    }

    result = explain_interaction_with_gemini(faiss_payload)
    print(result)