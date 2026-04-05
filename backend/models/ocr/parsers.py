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

    if match := re.search(
        r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})", text
    ):
        month = MONTH_MAP[match[1]]
        year = int(match[2])
        return datetime.date(year, month, 1).isoformat()

    if match := re.search(r"(\d{2})[/-](\d{4})", text):
        month = int(match[1])
        year = int(match[2])
        return datetime.date(year, month, 1).isoformat()

    if match := re.search(r"(\d{2})[/-](\d{2})", text):
        month = int(match[1])
        year = int(f"20{match[2]}")
        return datetime.date(year, month, 1).isoformat()

    return None

# Add/replace these two functions in your parsers.py
# They now accept image_bytes and use Gemini Vision when OCR text is empty/weak

import base64
import json
import re
import google.generativeai as genai
from PIL import Image
import io

# Configure once at module level (or wherever you set up genai)
# genai.configure(api_key=os.environ["GEMINI_API_KEY"])

MEDICINE_PROMPT = """
You are a pharmacy AI. Extract medicine information from this image.
Return ONLY valid JSON with these exact keys:
{
  "medicine_name": "string or null",
  "dosage": "string or null",
  "composition": "string or null",
  "expiry_date": "string or null",
  "mfg_date": "string or null",
  "precautions": "string or null",
  "medicine_type": "string or null"
}
No explanation. No markdown. JSON only.
"""

PRESCRIPTION_PROMPT = """
You are a pharmacy AI. Extract prescription information from this image.
Return ONLY valid JSON with these exact keys (use null for missing fields):
{
  "doctor_name": "string or null",
  "patient_name": "string or null",
  "date": "string or null",
  "medicines": ["list of medicine names"],
  "dosages": ["list of dosages"],
  "instructions": "string or null",
  "diagnosis": "string or null"
}
No explanation. No markdown. JSON only.
"""


def _parse_gemini_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON safely."""
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {}


async def gemini_extract_medicine(
    ocr_text: str = "",
    image_bytes: bytes | None = None,
) -> dict:
    """
    Extract medicine fields using Gemini.

    Strategy:
    - If image_bytes provided → use Gemini Vision (image + prompt).
      This works even when OCR text is empty or garbage.
    - If only ocr_text → fall back to text-only Gemini call.
    """
    print("[LLM] Running Gemini medicine extraction...")
    model = genai.GenerativeModel("gemini-1.5-flash")

    try:
        if image_bytes:
            # ✅ Vision path — Gemini reads the image directly
            print("[LLM] Using Gemini Vision (image_bytes provided)")
            pil_image = Image.open(io.BytesIO(image_bytes))
            response = model.generate_content([MEDICINE_PROMPT, pil_image])
        elif ocr_text.strip():
            # Fallback: text only
            print("[LLM] Using Gemini text-only (no image bytes)")
            prompt = f"{MEDICINE_PROMPT}\n\nOCR Text:\n{ocr_text}"
            response = model.generate_content(prompt)
        else:
            print("[LLM ⚠️] No image bytes and no OCR text — Gemini skipped")
            return {}

        raw = response.text
        print(f"[LLM] Gemini raw response: {raw[:300]}")
        return _parse_gemini_json(raw)

    except Exception as e:
        print(f"[LLM ❌] Gemini medicine extraction failed: {e}")
        return {}


async def gemini_extract_prescription(
    ocr_text: str = "",
    image_bytes: bytes | None = None,
) -> dict:
    """
    Extract prescription fields using Gemini Vision.
    Same strategy as gemini_extract_medicine.
    """
    print("[LLM] Running Gemini prescription extraction...")
    model = genai.GenerativeModel("gemini-1.5-flash")

    try:
        if image_bytes:
            print("[LLM] Using Gemini Vision (image_bytes provided)")
            pil_image = Image.open(io.BytesIO(image_bytes))
            response = model.generate_content([PRESCRIPTION_PROMPT, pil_image])
        elif ocr_text.strip():
            print("[LLM] Using Gemini text-only (no image bytes)")
            prompt = f"{PRESCRIPTION_PROMPT}\n\nOCR Text:\n{ocr_text}"
            response = model.generate_content(prompt)
        else:
            print("[LLM ⚠️] No image bytes and no OCR text — Gemini skipped")
            return {}

        raw = response.text
        print(f"[LLM] Gemini raw response: {raw[:300]}")
        return _parse_gemini_json(raw)

    except Exception as e:
        print(f"[LLM ❌] Gemini prescription extraction failed: {e}")
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

    # ✅ JPEG doesn't support alpha channel — convert before saving
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")

    quality = 95

    while True:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        size_kb = buffer.tell() / 1024

        if size_kb <= max_size_kb or quality <= 30:
            return buffer.getvalue()

        quality -= 10