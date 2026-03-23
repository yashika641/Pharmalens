from typing import Optional, Dict, Any
from backend.utils.supabase import get_supabase
from backend.models.ocr.exceptions import OCREngineError
import re, datetime

MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4,
    "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8,
    "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12
}

def normalize_expiry_date(text):
    if not text:
        return None
    text = text.upper().replace(".", "").strip()

    match = re.search(r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})", text)
    if match:
        return datetime.date(int(match[2]), MONTH_MAP[match[1]], 1).isoformat()

    match = re.search(r"(\d{2})[/-](\d{4})", text)
    if match:
        return datetime.date(int(match[2]), int(match[1]), 1).isoformat()

    match = re.search(r"(\d{2})[/-](\d{2})", text)
    if match:
        return datetime.date(int(f"20{match[2]}"), int(match[1]), 1).isoformat()

    return None


def _bool_needs_review(confidence: float, threshold: float = 0.80) -> bool:
    return confidence < threshold


# ---------------------------------------------------------
# Core helper: upsert a {id, name} entry into user_history
# column: "medicine_scan_ids" | "prescription_ids"
# entry:  {"id": "<uuid>", "name": "<display name>"}
# ---------------------------------------------------------
def _append_to_user_history(
    user_id: str,
    entry: Dict[str, str],   # {"id": "...", "name": "..."}
    column: str
) -> None:
    supabase = get_supabase()

    res = (
        supabase.table("user_history")
        .select(column)
        .eq("user_id", user_id)
        .execute()
    )

    # Case 1: No row exists → create a fresh row
    if len(res.data) == 0:
        supabase.table("user_history").insert({
            "user_id": user_id,
            "medicine_scan_ids": [entry] if column == "medicine_scan_ids" else [],
            "prescription_ids":  [entry] if column == "prescription_ids"  else [],
        }).execute()
        return

    # Case 2: Row exists → append entry if id not already present
    existing = res.data[0].get(column)
    current_entries = existing if isinstance(existing, list) else []

    # Avoid duplicates by id
    already_exists = any(
        e.get("id") == entry["id"]
        for e in current_entries
        if isinstance(e, dict)
    )

    if not already_exists:
        current_entries.append(entry)
        supabase.table("user_history") \
            .update({column: current_entries}) \
            .eq("user_id", user_id) \
            .execute()


# ---------------------------------------------------------
# Medicine OCR persistence
# ---------------------------------------------------------
def save_medicine_ocr_result(
    *,
    image_id: str,
    user_id: str,
    raw_text: str,
    parsed_data: Dict[str, Optional[Any]],
    confidence: float,
    ocr_engine: str,
    fallback_used: bool,
) -> None:
    supabase = get_supabase()
    try:
        payload = {
            "image_id":      image_id,
            "medicine_name": parsed_data.get("medicine_name"),
            "dosage":        parsed_data.get("dosage"),
            "composition":   parsed_data.get("composition"),
            "expiry_date":   normalize_expiry_date(parsed_data.get("expiry_date")),
            "mfg_date":      parsed_data.get("mfg_date"),
            "precautions":   parsed_data.get("precautions"),
            "medicine_type": parsed_data.get("medicine_type"),
            "raw_text":      raw_text,
            "confidence":    confidence,
            "ocr_engine":    ocr_engine,
            "fallback_used": fallback_used,
        }

        response = supabase.table("medicine_ocr_data") \
            .insert(payload) \
            .execute()

        new_id = str(response.data[0]["id"])

        # Use parsed medicine name, fallback to "Paracetamol" if null/empty
        medicine_name = (parsed_data.get("medicine_name") or "").strip() or "Paracetamol"

        entry = {"id": new_id, "name": medicine_name}
        _append_to_user_history(user_id, entry, "medicine_scan_ids")

    except Exception as exc:
        raise OCREngineError(f"Failed to save medicine OCR data: {exc}") from exc


# ---------------------------------------------------------
# Prescription OCR persistence
# ---------------------------------------------------------
def save_prescription_ocr_result(
    *,
    image_id: str,
    user_id: str,
    raw_text: str,
    parsed_data: Dict[str, Optional[Any]],
    confidence: float,
    ocr_engine: str,
    fallback_used: bool,
) -> None:
    supabase = get_supabase()
    try:
        payload = {
            "image_id":            image_id,
            "doctor_name":         parsed_data.get("doctor_name"),
            "prescription_date":   parsed_data.get("prescription_date"),
            "diagnosis":           parsed_data.get("diagnosis"),
            "medicines":           parsed_data.get("medicines"),
            "routes":              parsed_data.get("routes"),
            "raw_text":            raw_text,
            "confidence":          confidence,
            "ocr_engine":          ocr_engine,
            "fallback_used":       fallback_used,
        }

        response = supabase.table("prescription_ocr_data") \
            .insert(payload) \
            .execute()

        new_id = str(response.data[0]["id"])

        # Use parsed doctor name, fallback to "Dr. Tapil Saina" if null/empty
        doctor_name = (parsed_data.get("doctor_name") or "").strip() or "Tapil Saina"

        entry = {"id": new_id, "name": doctor_name}
        _append_to_user_history(user_id, entry, "prescription_ids")

    except Exception as exc:
        raise OCREngineError(f"Failed to save prescription OCR data: {exc}") from exc