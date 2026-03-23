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



import datetime
import re

MONTH_MAP = {
    "JAN":1,"FEB":2,"MAR":3,"APR":4,"MAY":5,"JUN":6,
    "JUL":7,"AUG":8,"SEP":9,"OCT":10,"NOV":11,"DEC":12
}

def normalize_expiry_date(text):

    if not text:
        return None

    text = text.upper().replace(".", "").strip()

    # 1️⃣ Format: SEP 2024
    match = re.search(r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})", text)
    if match:
        month = MONTH_MAP[match.group(1)]
        year = int(match.group(2))
        return datetime.date(year, month, 1).isoformat()

    # 2️⃣ Format: 08/2021 or 08-2021
    match = re.search(r"(\d{2})[/-](\d{4})", text)
    if match:
        month = int(match.group(1))
        year = int(match.group(2))
        return datetime.date(year, month, 1).isoformat()

    # 3️⃣ Format: 09/24
    match = re.search(r"(\d{2})[/-](\d{2})", text)
    if match:
        month = int(match.group(1))
        year = int("20" + match.group(2))
        return datetime.date(year, month, 1).isoformat()

    return None

async def gemini_extract_prescription(raw_text: str) -> dict:
    llm = get_gemini_llm()

    print("[LLM] Falling back to Gemini for prescription extraction...")
    print("[LLM] Raw OCR text for Gemini:", raw_text)

    prompt = f"""
Extract prescription information from this OCR text.
also normalize prescription_date to ISO format (YYYY-MM-DD) if possible.and check if the medicines names are legitimate medicine names, find the closest match if the OCR text is slightly off. If you cannot find a confident match, return null for that medicine.
Return JSON with fields:
doctor_name
patient_name
prescription_date
diagnosis
medicines (list of objects with fields: name, dosage, instructions)
routes (list of administration routes like oral, IV, etc.)

OCR TEXT:
{raw_text}

Return ONLY valid JSON.
"""

    response = await llm.generate(prompt)  # type: ignore

    print("[LLM] Gemini response:", response)

    try:

        # remove ```json ``` wrappers
        cleaned = re.sub(r"```json|```", "", response).strip()

        data = json.loads(cleaned)

        print("GEMINI PRESCRIPTION PARSED:", data)

        return data

    except Exception:
        return {}
    
    
def needs_prescription_llm_fallback(parsed: dict) -> bool:
    return (
        not parsed.get("doctor_name")
        or not parsed.get("medicines")
    )
    
def merge_results_prescription(primary: dict, gemini: dict) -> dict:
    
    result = primary.copy()

    for key, gem_val in gemini.items():

        prim_val = primary.get(key)

        # if primary empty → use gemini
        if prim_val in [None, "", [], {}]:
            result[key] = gem_val

        # if both strings → prefer longer (Gemini usually richer)
        elif isinstance(prim_val, str) and isinstance(gem_val, str):
            if len(gem_val) > len(prim_val):
                result[key] = gem_val

        # if primary list empty but gemini has data
        elif isinstance(prim_val, list) and not prim_val and gem_val:
            result[key] = gem_val

    return result

from PIL import Image
import io

def compress_image_for_ocr_space(image_bytes: bytes, max_size_kb=900) -> bytes:

    img = Image.open(io.BytesIO(image_bytes))

    quality = 95

    while True:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        size_kb = buffer.tell() / 1024

        if size_kb <= max_size_kb or quality <= 30:
            return buffer.getvalue()

        quality -= 10