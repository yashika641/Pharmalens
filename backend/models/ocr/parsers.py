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

import json
import re
import io
from PIL import Image
from google.genai import types

from backend.utils.llm import _get_client  # reuse existing client

_MODEL_NAME = "gemini-2.5-flash"

MEDICINE_PROMPT = """
You are a world-class pharmacist AI with 30 years of experience in pharmaceutical sciences, drug identification, and medication safety. You have encyclopedic knowledge of brand names, generic names, active ingredients, dosage forms, and packaging conventions across global pharmaceutical markets (India, US, EU, Southeast Asia, Middle East, etc.).

Your task: Extract ALL medicine information from the provided image with maximum accuracy.

Return ONLY valid JSON. No explanation. No markdown. No code blocks. Raw JSON only.

═══════════════════════════════════════════
FIELD DEFINITIONS & EXTRACTION RULES
═══════════════════════════════════════════

medicine_name:
  - Extract the PRIMARY brand name or generic name printed most prominently
  - Prefer brand name if visible (e.g. "Crocin", "Augmentin", "Dolo")
  - If only generic name visible, use that (e.g. "Paracetamol", "Amoxicillin")
  - Normalize capitalization (Title Case)
  - null if completely unreadable

dosage:
  - The STRENGTH per unit of the medicine
  - Include the unit: mg, mcg, g, ml, IU, units, %
  - Examples: "500mg", "250mcg", "5ml", "10mg/5ml", "1000 IU", "0.1%"
  - For combination drugs: "500mg/125mg"
  - null if not visible

composition:
  - ALL active pharmaceutical ingredients with their amounts
  - Format: "Ingredient1 Xmg + Ingredient2 Ymg"
  - Examples:
    "Amoxicillin 500mg + Clavulanic Acid 125mg"
    "Paracetamol 650mg"
    "Cetirizine Hydrochloride 10mg"
    "Salbutamol 2mg + Guaifenesin 100mg per 5ml"
  - Include salts/forms if visible (e.g. "Hydrochloride", "Sodium", "Trihydrate")
  - null if not visible

expiry_date:
  - Convert to ISO format YYYY-MM-DD whenever possible
  - If only month/year given: use last day of that month (e.g. "10/2025" → "2025-10-31")
  - If written as "EXP JAN 2026" → "2026-01-31"
  - If written as "EXP 03/27" → "2027-03-31"
  - If exact date given "15/08/2025" → "2025-08-15"
  - Return raw text if format is completely ambiguous
  - null if not visible

mfg_date:
  - Same conversion rules as expiry_date
  - Look for "MFG", "Mfd.", "Manufacturing Date", "DOM", "Date of Manufacture"
  - "MFG: JUN 2023" → "2023-06-01" (use first day for manufacture dates)
  - null if not visible

precautions:
  - ALL safety warnings, storage instructions, and contraindications visible
  - Examples:
    "Keep out of reach of children. Store below 25°C. Avoid sunlight."
    "Not for use in patients with penicillin allergy. Keep refrigerated between 2-8°C."
    "May cause drowsiness. Do not operate machinery. Avoid alcohol."
    "Store in a cool dry place. Protect from moisture and light."
  - Combine multiple warnings into one string separated by ". "
  - null if none visible

medicine_type:
  - The physical dosage form
  - Must be one of: "tablet", "capsule", "syrup", "suspension", "injection",
    "ointment", "cream", "gel", "drops", "inhaler", "patch", "suppository",
    "powder", "solution", "spray", "lotion", "sachet", "strip", "vial", "ampoule"
  - Infer from packaging if not explicitly stated
  - null if cannot be determined

═══════════════════════════════════════════
MULTISHOT EXAMPLES
═══════════════════════════════════════════

--- EXAMPLE 1: Standard Antibiotic Tablet Strip ---
Image shows: "AUGMENTIN 625 DUO | Amoxicillin 500mg + Clavulanic Acid 125mg | 10 Tablets | EXP 08/2026 | MFG SEP 2024 | Store below 25°C. Keep dry."

Output:
{
  "medicine_name": "Augmentin 625 Duo",
  "dosage": "625mg",
  "composition": "Amoxicillin 500mg + Clavulanic Acid 125mg",
  "expiry_date": "2026-08-31",
  "mfg_date": "2024-09-01",
  "precautions": "Store below 25°C. Keep dry.",
  "medicine_type": "tablet"
}

--- EXAMPLE 2: Pediatric Syrup ---
Image shows: "Calpol Paediatric Suspension | Paracetamol 120mg/5ml | 60ml | EXP: 03/2025 | MFG: APR 2023 | Keep out of reach of children. Do not refrigerate. Shake well before use."

Output:
{
  "medicine_name": "Calpol Paediatric Suspension",
  "dosage": "120mg/5ml",
  "composition": "Paracetamol 120mg per 5ml",
  "expiry_date": "2025-03-31",
  "mfg_date": "2023-04-01",
  "precautions": "Keep out of reach of children. Do not refrigerate. Shake well before use.",
  "medicine_type": "suspension"
}

--- EXAMPLE 3: Topical Cream ---
Image shows: "Betnovate-N Cream | Betamethasone Valerate 0.1% + Neomycin Sulphate 0.5% | 20g | Exp: Jan 2026 | For external use only. Avoid eyes. Do not use on broken skin."

Output:
{
  "medicine_name": "Betnovate-N Cream",
  "dosage": "0.1% / 0.5%",
  "composition": "Betamethasone Valerate 0.1% + Neomycin Sulphate 0.5%",
  "expiry_date": "2026-01-31",
  "mfg_date": null,
  "precautions": "For external use only. Avoid contact with eyes. Do not use on broken skin.",
  "medicine_type": "cream"
}

--- EXAMPLE 4: Injection Vial ---
Image shows: "Insulin Glargine 100 IU/ml | Lantus | 10ml Vial | MFG: 15/01/2024 | EXP: 15/01/2026 | Refrigerate 2-8°C. Do not freeze. Discard 28 days after opening."

Output:
{
  "medicine_name": "Lantus",
  "dosage": "100 IU/ml",
  "composition": "Insulin Glargine 100 IU per ml",
  "expiry_date": "2026-01-15",
  "mfg_date": "2024-01-15",
  "precautions": "Refrigerate between 2-8°C. Do not freeze. Discard 28 days after first opening.",
  "medicine_type": "injection"
}

--- EXAMPLE 5: Partially Visible / Worn Label ---
Image shows: "...cetamol 500mg... strip... EXP 2/27... store cool..."

Output:
{
  "medicine_name": "Paracetamol",
  "dosage": "500mg",
  "composition": "Paracetamol 500mg",
  "expiry_date": "2027-02-28",
  "mfg_date": null,
  "precautions": "Store in a cool place.",
  "medicine_type": "tablet"
}

--- EXAMPLE 6: Capsule with Generic Name Only ---
Image shows: "Omeprazole Capsules IP 20mg | 10 Capsules | Mfd: Jun 2024 | Exp: May 2026 | Keep away from moisture. Store below 30°C."

Output:
{
  "medicine_name": "Omeprazole",
  "dosage": "20mg",
  "composition": "Omeprazole 20mg",
  "expiry_date": "2026-05-31",
  "mfg_date": "2024-06-01",
  "precautions": "Keep away from moisture. Store below 30°C.",
  "medicine_type": "capsule"
}

═══════════════════════════════════════════
RETURN FORMAT (strict)
═══════════════════════════════════════════

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
You are a world-class clinical pharmacist AI with 30 years of experience deciphering handwritten and printed prescriptions across multiple medical specialties, languages, and countries. You are trained in medical abbreviations, Latin prescription notation, drug nomenclature, dosage forms, and clinical shorthand used by doctors globally.

Your task: Extract ALL prescription information from the provided image with maximum accuracy, even from difficult handwriting.

Return ONLY valid JSON. No explanation. No markdown. No code blocks. Raw JSON only.

═══════════════════════════════════════════
MEDICAL ABBREVIATION REFERENCE
═══════════════════════════════════════════

Frequency:
  OD / QD / od = Once daily
  BD / BID / bid = Twice daily
  TDS / TID / tid = Three times daily
  QID / qid = Four times daily
  HS / hs = At bedtime
  SOS / PRN = As needed
  OW = Once weekly
  EOD = Every other day
  AC = Before meals
  PC = After meals
  STAT = Immediately

Route:
  PO / p.o. = By mouth (oral)
  IV = Intravenous
  IM = Intramuscular
  SC / SQ = Subcutaneous
  SL = Sublingual
  TOP = Topical
  INH = Inhalation
  PR = Per rectum

Duration:
  x3d = for 3 days
  x5/7 = for 5 days
  x2/52 = for 2 weeks
  x1/12 = for 1 month

Quantity:
  Tab = Tablet
  Cap = Capsule
  Syr = Syrup
  Inj = Injection
  Oint = Ointment
  Susp = Suspension

═══════════════════════════════════════════
FIELD DEFINITIONS & EXTRACTION RULES
═══════════════════════════════════════════

doctor_name:
  - Full name with title (Dr., Prof., etc.)
  - Check letterhead, stamp, or signature area
  - Examples: "Dr. Priya Sharma", "Prof. Ahmed Al-Hassan", "Dr. James O'Brien MD"
  - null if not found

patient_name:
  - Full name of the patient
  - Look for "Patient:", "Name:", "Pt.", or top of prescription form
  - Examples: "Rahul Mehta", "Mary Johnson", "Ahmed Khan"
  - null if not found

date:
  - The date the prescription was written
  - Convert to ISO format YYYY-MM-DD
  - "15/3/25" → "2025-03-15"
  - "March 15, 2025" → "2025-03-15"
  - "15-03-25" → "2025-03-15"
  - null if not found

medicines:
  - List of ALL medicine names prescribed
  - Include brand OR generic name as written
  - Examples: ["Amoxicillin", "Paracetamol", "Omeprazole"]
  - ["Augmentin 625", "Dolo 650", "Pan 40"]
  - Clean up abbreviations: "Tab. Metformin" → "Metformin"
  - Empty list [] if none found (never null)

dosages:
  - Corresponding dosage for each medicine in the same order as medicines list
  - Include strength + frequency + duration if visible
  - Examples:
    "500mg twice daily for 7 days"
    "650mg as needed, max 3 times daily"
    "40mg once daily before breakfast"
    "5ml three times daily after meals for 5 days"
    "1 tablet at bedtime"
  - Use null for individual entries if not visible: ["500mg OD", null, "20mg BD"]
  - Empty list [] if no medicines found

instructions:
  - ALL additional doctor notes, special instructions, dietary advice, follow-up dates
  - Examples:
    "Take with food. Avoid alcohol. Follow up after 1 week."
    "Complete the full course. Do not stop early. Rest for 3 days."
    "Avoid spicy food. Drink plenty of water. Return if fever persists."
    "Check blood sugar weekly. Low carb diet advised."
  - null if none written

diagnosis:
  - The diagnosed condition or chief complaint
  - Look for "Dx:", "Diagnosis:", "C/O:", "Impression:", "For:"
  - Expand abbreviations: "URTI" → "Upper Respiratory Tract Infection"
  - Examples:
    "Upper Respiratory Tract Infection"
    "Type 2 Diabetes Mellitus"
    "Acute Gastroenteritis"
    "Hypertension"
    "Allergic Rhinitis"
  - null if not mentioned

═══════════════════════════════════════════
MULTISHOT EXAMPLES
═══════════════════════════════════════════

--- EXAMPLE 1: Printed Clinic Prescription ---
Image shows letterhead "Dr. Anjali Verma, MBBS MD | City Clinic"
Patient: Ramesh Kumar | Date: 12/04/2025
Rx:
1. Tab. Augmentin 625mg - 1-0-1 x 5 days (after food)
2. Tab. Dolo 650 - 1-1-1 SOS
3. Cap. Pan 40 - 1-0-0 (before breakfast)
Diagnosis: Acute Tonsillitis
Advice: Warm saline gargles. Avoid cold drinks. Review after 5 days.

Output:
{
  "doctor_name": "Dr. Anjali Verma",
  "patient_name": "Ramesh Kumar",
  "date": "2025-04-12",
  "medicines": ["Augmentin 625", "Dolo 650", "Pan 40"],
  "dosages": [
    "625mg twice daily after food for 5 days",
    "650mg three times daily as needed",
    "40mg once daily before breakfast"
  ],
  "instructions": "Warm saline gargles. Avoid cold drinks. Review after 5 days.",
  "diagnosis": "Acute Tonsillitis"
}

--- EXAMPLE 2: Handwritten Prescription (messy) ---
Image shows partial handwriting:
"Dr. S. Patel | 3/3/25"
"Pt: Mrs. Fatima"
"1) Metformin 500 BD pc"
"2) Glimepiride 1mg OD AC"
"3) Atorvastatin 10 HS"
"D: T2DM + Dyslipidemia"
"Adv: Low sugar diet. Walk 30min daily. RBS monthly."

Output:
{
  "doctor_name": "Dr. S. Patel",
  "patient_name": "Mrs. Fatima",
  "date": "2025-03-03",
  "medicines": ["Metformin", "Glimepiride", "Atorvastatin"],
  "dosages": [
    "500mg twice daily after meals",
    "1mg once daily before meals",
    "10mg once daily at bedtime"
  ],
  "instructions": "Low sugar diet. Walk 30 minutes daily. Random blood sugar check monthly.",
  "diagnosis": "Type 2 Diabetes Mellitus and Dyslipidemia"
}

--- EXAMPLE 3: Hospital Discharge Prescription ---
Image shows: "City General Hospital | Dept. of Cardiology"
"Physician: Prof. Ahmed Hassan MD DM"
"Patient: John Smith | Date: 01 January 2025"
"1. Aspirin 75mg OD after food"
"2. Atorvastatin 40mg HS"
"3. Metoprolol 25mg BD"
"4. Ramipril 5mg OD"
"Dx: Acute MI - Post PCI"
"F/U: OPD after 2 weeks. Avoid strenuous activity for 4 weeks."

Output:
{
  "doctor_name": "Prof. Ahmed Hassan",
  "patient_name": "John Smith",
  "date": "2025-01-01",
  "medicines": ["Aspirin", "Atorvastatin", "Metoprolol", "Ramipril"],
  "dosages": [
    "75mg once daily after food",
    "40mg once daily at bedtime",
    "25mg twice daily",
    "5mg once daily"
  ],
  "instructions": "Follow up at OPD after 2 weeks. Avoid strenuous physical activity for 4 weeks.",
  "diagnosis": "Acute Myocardial Infarction - Post Percutaneous Coronary Intervention"
}

--- EXAMPLE 4: Pediatric Prescription ---
Image shows: "Dr. Meena Iyer, Pediatrician | Child Care Clinic"
"Child: Arjun (8 yrs, 25kg) | 22-02-2025"
"1. Amoxicillin 250mg/5ml syrup - 5ml TDS x 7 days"
"2. Paracetamol syrup 250mg/5ml - 7.5ml TDS SOS (fever >100F)"
"3. Montelukast 5mg chewable - 1 tab OD HS x 10 days"
"C/O: Wheeze + fever. Dx: Viral Wheeze"
"Adv: Steam inhalation BD. Plenty of fluids."

Output:
{
  "doctor_name": "Dr. Meena Iyer",
  "patient_name": "Arjun",
  "date": "2025-02-22",
  "medicines": ["Amoxicillin", "Paracetamol", "Montelukast"],
  "dosages": [
    "250mg/5ml syrup, 5ml three times daily for 7 days",
    "250mg/5ml syrup, 7.5ml three times daily as needed for fever above 100°F",
    "5mg chewable tablet, once daily at bedtime for 10 days"
  ],
  "instructions": "Steam inhalation twice daily. Ensure plenty of fluids.",
  "diagnosis": "Viral Wheeze"
}

--- EXAMPLE 5: Partially Illegible Handwriting ---
Image shows very messy handwriting, only partial words readable:
"Dr. ...kumar | Date: ...3/2025"
"...etformin... 500... twice"
"...lorvas... 10mg nite"
"DM"

Output:
{
  "doctor_name": "Dr. Kumar",
  "patient_name": null,
  "date": null,
  "medicines": ["Metformin", "Clorvastatin"],
  "dosages": [
    "500mg twice daily",
    "10mg at night"
  ],
  "instructions": null,
  "diagnosis": "Diabetes Mellitus"
}

--- EXAMPLE 6: Specialist Dermatology Prescription ---
Image: "Dr. Fatima Al-Rashid, Dermatologist | Skin & Laser Centre | 10/11/2024"
"Pt: Sarah Ahmed"
"1. Doxycycline 100mg - 1 cap OD x 3 months"
"2. Tretinoin 0.025% cream - apply thin layer OD at night to affected area"
"3. Clindamycin 1% gel - apply BD morning and night"
"Dx: Acne Vulgaris Grade III"
"Adv: Use SPF 50 sunscreen daily. Avoid picking. No facials for 1 month."

Output:
{
  "doctor_name": "Dr. Fatima Al-Rashid",
  "patient_name": "Sarah Ahmed",
  "date": "2024-11-10",
  "medicines": ["Doxycycline", "Tretinoin 0.025% cream", "Clindamycin 1% gel"],
  "dosages": [
    "100mg once daily for 3 months",
    "Apply thin layer once daily at night to affected area",
    "Apply twice daily in morning and at night"
  ],
  "instructions": "Use SPF 50 sunscreen daily. Avoid picking at skin. No facial treatments for 1 month.",
  "diagnosis": "Acne Vulgaris Grade III"
}

═══════════════════════════════════════════
RETURN FORMAT (strict)
═══════════════════════════════════════════

{
  "doctor_name": "string or null",
  "patient_name": "string or null",
  "date": "string or null",
  "medicines": ["array of strings, never null"],
  "dosages": ["array of strings or nulls, same length as medicines"],
  "instructions": "string or null",
  "diagnosis": "string or null"
}

No explanation. No markdown. JSON only.
"""


def _parse_gemini_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {}


def _image_bytes_to_part(image_bytes: bytes) -> types.Part:
    """
    Re-encode through PIL to guarantee valid PNG bytes.
    This also fixes the OCR.Space E302 corruption issue —
    same clean bytes can be reused for OCR.Space too.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png")


async def gemini_extract_medicine(
    ocr_text: str = "",
    image_bytes: bytes | None = None,
) -> dict:
    print("[LLM] Running Gemini medicine extraction...")
    client = _get_client()

    try:
        if image_bytes:
            print("[LLM] Using Gemini Vision (image_bytes)")
            contents = [_image_bytes_to_part(image_bytes), MEDICINE_PROMPT]
        elif ocr_text.strip():
            print("[LLM] Using Gemini text-only")
            contents = f"{MEDICINE_PROMPT}\n\nOCR Text:\n{ocr_text}"
        else:
            print("[LLM ⚠️] No image and no OCR text — Gemini skipped")
            return {}

        response = client.models.generate_content(
            model=_MODEL_NAME,
            contents=contents,
        )

        raw = response.text or ""
        print(f"[LLM] Gemini response: {raw[:300]}")
        return _parse_gemini_json(raw)

    except Exception as e:
        print(f"[LLM ❌] Gemini medicine extraction failed: {e}")
        return {}


async def gemini_extract_prescription(
    ocr_text: str = "",
    image_bytes: bytes | None = None,
) -> dict:
    print("[LLM] Running Gemini prescription extraction...")
    client = _get_client()

    try:
        if image_bytes:
            print("[LLM] Using Gemini Vision (image_bytes)")
            contents = [_image_bytes_to_part(image_bytes), PRESCRIPTION_PROMPT]
        elif ocr_text.strip():
            print("[LLM] Using Gemini text-only")
            contents = f"{PRESCRIPTION_PROMPT}\n\nOCR Text:\n{ocr_text}"
        else:
            print("[LLM ⚠️] No image and no OCR text — Gemini skipped")
            return {}

        response = client.models.generate_content(
            model=_MODEL_NAME,
            contents=contents,
        )

        raw = response.text or ""
        print(f"[LLM] Gemini response: {raw[:300]}")
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