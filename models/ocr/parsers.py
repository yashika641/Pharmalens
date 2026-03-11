import re
from typing import Optional, List, Dict


# -----------------------------
# Helper functions
# -----------------------------
def _extract_date(pattern: str, text: str) -> Optional[str]:
    if match := re.search(pattern, text):
        return match[2]
    return None


# -----------------------------
# Medicine Parser
# -----------------------------
def parse_medicine(text: str) -> Dict[str, Optional[str]]:
    """
    Parse structured medicine information from OCR text.
    Conservative by design: missing or unclear fields → None.
    """

    if not text:
        return {
            "medicine_name": None,
            "dosage": None,
            "composition": None,
            "expiry_date": None,
            "mfg_date": None,
            "precautions": None,
            "medicine_type": None,
        }

    lower = text.lower()

    # Medicine name (explicit only)
    name_match = re.search(
        r"\b(paracetamol|ibuprofen|amoxicillin|azithromycin|cetirizine)\b",
        lower,
    )
    medicine_name = name_match[1].capitalize() if name_match else None

    # Dosage (strength only)
    dosage = None
    if dose_match := re.search(r"\b(\d+\s?(mg|ml|mcg))\b", lower):
        dosage = dose_match[1].replace(" ", "")

    # Composition
    composition = None
    if comp_match := re.search(
        r"(composition|contains|each tablet contains)(.*)",
        lower,
    ):
        composition = comp_match[2].strip()

    # Dates
    expiry_date = _extract_date(
        r"(exp|expiry|use before)[:\s\-]*([0-9]{2}[\/\-][0-9]{4})",
        lower,
    )
    mfg_date = _extract_date(
        r"(mfg|manufactured|mfd)[:\s\-]*([0-9]{2}[\/\-][0-9]{4})",
        lower,
    )

    # Precautions (explicit only)
    precaution_phrases = [
        "do not exceed",
        "for external use only",
        "keep out of reach",
        "not for children",
    ]
    precautions = next(
        (phrase.capitalize() for phrase in precaution_phrases if phrase in lower),
        None,
    )
    # Medicine type (tablet, syrup, injection)
    type_match = re.search(
        r"\b(tablet|cap|syrup|inj|ointment|cream)\b",
        lower,
    )
    medicine_type = type_match[1].capitalize() if type_match else None


    return {
        "medicine_name": medicine_name,
        "dosage": dosage,
        "composition": composition,
        "medicine_type": medicine_type,
        "expiry_date": expiry_date,
        "mfg_date": mfg_date,
        "precautions": precautions,
    }


# -----------------------------
# Prescription Parser
# -----------------------------
def parse_prescription(text: str) -> Dict[str, Optional[object]]:
    """
    Parse structured prescription data from OCR text.
    Conservative and safe by design.
    """

    if not text:
        return {
            "doctor_name": None,
            "prescription_date": None,
            "diagnosis": None,
            "medicines": None,
            "routes": None,
        }

    lower = text.lower()

    # Doctor name
    doc_match = re.search(r"\b(dr\.?\s+[a-z\s]+)", lower)
    doctor_name = doc_match[1].title() if doc_match else None

    # Prescription date
    date_match = re.search(
        r"(date|dt)[:\s\-]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})",
        lower,
    )
    prescription_date = date_match[2] if date_match else None

    # Diagnosis
    diag_match = re.search(
        r"(dx|diagnosis|c\/o)[:\s\-]*(.+)",
        lower,
    )
    diagnosis = diag_match[2].strip() if diag_match else None

    # Medicines list
    medicines: Optional[List[Dict[str, Optional[str]]]] = []

    med_lines = re.findall(
        r"(tab|cap|syr|inj)\s+([a-z]+)\s*([\d]+\s?(mg|ml))?\s*(od|bd|tds|hs)?\s*(x\s*\d+\s*days)?",
        lower,
    )

    medicines.extend(
        {
            "name": line[1].capitalize() if line[1] else None,
            "dose": line[2].replace(" ", "") if line[2] else None,
            "frequency": line[4].upper() if line[4] else None,
            "duration": line[5].replace("x", "").strip() if line[5] else None,
        }
        for line in med_lines
    )

    if not medicines:
        medicines = None

    # Routes of administration
    route_keywords = {
        "oral": "oral",
        "iv": "iv",
        "im": "im",
        "topical": "topical",
        "ointment": "topical",
        "tablet": "oral",
        "capsule": "oral",
    }

    routes = {value for key, value in route_keywords.items() if key in lower}
    routes = list(routes) if routes else None

    return {
        "doctor_name": doctor_name,
        "prescription_date": prescription_date,
        "diagnosis": diagnosis,
        "medicines": medicines,
        "routes": routes,
    }
    
    
def needs_llm_fallback(parsed: dict) -> bool:
    required = ["medicine_name", "dosage"]

    return any(parsed.get(field) is None for field in required)

import json
from backend.utils.llm import get_gemini_llm


async def gemini_extract_medicine(raw_text: str) -> dict:
    llm = get_gemini_llm()
    print("[LLM] Falling back to Gemini for medicine extraction...")
    print("[LLM] Raw OCR text for Gemini:", raw_text)
    prompt = f"""
Extract medicine information from this OCR text.

Return JSON with fields:
medicine_name
dosage
composition
expiry_date
mfg_date
precautions
medicine_type (e.g. tablet, syrup,IV)
OCR TEXT:
{raw_text}

Return ONLY valid JSON.
"""

    response = await llm.generate(prompt) #type: ignore
    print("[LLM] Gemini response:", response)
    try:

        # remove ```json ``` wrappers
        cleaned = re.sub(r"```json|```", "", response).strip()

        data = json.loads(cleaned)

        print("GEMINI PARSED:", data)

        return data
        
    except Exception:
        return {}
    
    
def merge_results(parsed, gemini):
    merged = parsed.copy()

    for k, v in gemini.items():
        if not merged.get(k) and v:
            merged[k] = v

    return merged

