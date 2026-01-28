from typing import Optional, Dict, Any
from backend.utils.supabase import get_supabase
from models.ocr.exceptions import OCREngineError


# ---------------------------------------------------------
# Helper
# ---------------------------------------------------------
def _bool_needs_review(confidence: float, threshold: float = 0.80) -> bool:
    return confidence < threshold


# ---------------------------------------------------------
# Medicine OCR persistence
# ---------------------------------------------------------
def save_medicine_ocr_result(
    *,
    image_id: str,
    raw_text: str,
    parsed_data: Dict[str, Optional[Any]],
    confidence: float,
    ocr_engine: str,
    fallback_used: bool,
) -> None:
    """
    Save structured medicine OCR data into medicine_ocr_data table.
    """
    supabase = get_supabase()
    try:
        payload = {
            "image_id": image_id,
            "medicine_name": parsed_data.get("medicine_name"),
            "dosage": parsed_data.get("dosage"),
            "composition": parsed_data.get("composition"),
            "expiry_date": parsed_data.get("expiry_date"),
            "mfg_date": parsed_data.get("mfg_date"),
            "precautions": parsed_data.get("precautions"),
            "raw_text": raw_text,
            "confidence": confidence,
            "ocr_engine": ocr_engine,
            "fallback_used": fallback_used,
            # "needs_review": _bool_needs_review(confidence),
        }

        supabase.table("medicine_ocr_data").insert(payload).execute()

    except Exception as exc:
        raise OCREngineError(
            f"Failed to save medicine OCR data: {exc}"
        ) from exc


# ---------------------------------------------------------
# Prescription OCR persistence
# ---------------------------------------------------------
def save_prescription_ocr_result(
    *,
    image_id: str,
    raw_text: str,
    parsed_data: Dict[str, Optional[Any]],
    confidence: float,
    ocr_engine: str,
    fallback_used: bool,
) -> None:
    """
    Save structured prescription OCR data into prescription_ocr_data table.
    """ 
    supabase = get_supabase()

    try:
        payload = {
            "image_id": image_id,
            "doctor_name": parsed_data.get("doctor_name"),
            "prescription_date": parsed_data.get("prescription_date"),
            "diagnosis": parsed_data.get("diagnosis"),
            "medicines": parsed_data.get("medicines"),  # jsonb
            "routes": parsed_data.get("routes"),        # jsonb
            "raw_text": raw_text,
            "confidence": confidence,
            "ocr_engine": ocr_engine,
            "fallback_used": fallback_used,
            # "needs_review": _bool_needs_review(confidence),
        }

        supabase.table("prescription_ocr_data").insert(payload).execute()

    except Exception as exc:
        raise OCREngineError(
            f"Failed to save prescription OCR data: {exc}"
        ) from exc
