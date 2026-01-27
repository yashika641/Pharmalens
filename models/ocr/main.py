import os
import requests

from backend.utils.supabase import supabase

from models.ocr.paddle_ocr import run_paddle_ocr
from models.ocr.easy_ocr import run_ocr_space
from models.ocr.parsers import parse_medicine, parse_prescription
from models.ocr.supabase_databse_update import (
    save_medicine_ocr_result,
    save_prescription_ocr_result,
)
from models.ocr.exceptions import OCREngineError


CONFIDENCE_THRESHOLD = 0.80
LOCAL_DEBUG_DIR = "ocr_debug"


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _ensure_debug_dir() -> None:
    os.makedirs(LOCAL_DEBUG_DIR, exist_ok=True)


def _save_raw_ocr_locally(image_id: str, engine: str, text: str) -> None:
    _ensure_debug_dir()
    path = os.path.join(LOCAL_DEBUG_DIR, f"{image_id}_{engine}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def _download_image(image_url: str) -> bytes:
    print("[OCR] Downloading image...")
    response = requests.get(image_url, timeout=15)
    response.raise_for_status()
    print("[OCR] Image downloaded")
    return response.content


# ---------------------------------------------------------
# Main OCR pipeline
# ---------------------------------------------------------
def run_latest_image_ocr_pipeline(user_id: str) -> None:
    print("\n================ OCR PIPELINE START ================")
    print(f"[OCR] User ID: {user_id}")

    # -------------------------------------------------
    # 1️⃣ Fetch latest image
    # -------------------------------------------------
    print("[OCR] Fetching latest image from Supabase...")

    resp = (
        supabase
        .table("images")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not resp.data:
        raise OCREngineError("No images found for user")

    image = resp.data[0]
    image_id = image["id"] #type: ignore
    image_type = image["image_type"] #type: ignore
    image_url = image["image_url"] #type: ignore

    print(f"[OCR] Image ID: {image_id}")
    print(f"[OCR] Image Type: {image_type}")

    # -------------------------------------------------
    # 2️⃣ Download image
    # -------------------------------------------------
    image_bytes = _download_image(image_url)

    # -------------------------------------------------
    # 3️⃣ PRIMARY OCR – PaddleOCR
    # -------------------------------------------------
    print("[OCR] Running PaddleOCR (primary)...")

    primary_text, primary_conf = run_paddle_ocr(image_bytes)

    print(f"[OCR] PaddleOCR confidence: {primary_conf:.3f}")

    _save_raw_ocr_locally(image_id, "paddle_primary", primary_text)

    if image_type == "medicine":
        primary_parsed = parse_medicine(primary_text)
    else:
        primary_parsed = parse_prescription(primary_text)

    final_text = primary_text
    final_parsed = primary_parsed
    final_confidence = primary_conf
    final_engine = "paddleocr"
    fallback_used = False

    # -------------------------------------------------
    # 4️⃣ FALLBACK OCR – EasyOCR
    # -------------------------------------------------
    if primary_conf < CONFIDENCE_THRESHOLD:
        print(
            f"[OCR ⚠️] Confidence below threshold "
            f"({primary_conf:.2f} < {CONFIDENCE_THRESHOLD})"
        )
        print("[OCR] Running EasyOCR fallback...")

        fallback_used = True

        fallback_text, fallback_conf = run_ocr_space(image_bytes)

        print(f"[OCR] OCR.Space confidence: {fallback_conf:.3f}")

        _save_raw_ocr_locally(image_id, "ocr_space_fallback", fallback_text)
        if fallback_conf > primary_conf:
            print("[OCR] EasyOCR selected as final result")

            if image_type == "medicine":
                fallback_parsed = parse_medicine(fallback_text)
            else:
                fallback_parsed = parse_prescription(fallback_text)

            final_text = fallback_text
            final_parsed = fallback_parsed
            final_confidence = fallback_conf
            final_engine = "easyocr"
        else:
            print("[OCR] PaddleOCR retained")

    # -------------------------------------------------
    # 5️⃣ Persist result
    # -------------------------------------------------
    print("[OCR] Saving OCR result to Supabase...")

    if image_type == "medicine":
        save_medicine_ocr_result(
            image_id=image_id,
            raw_text=final_text,
            parsed_data=final_parsed,
            confidence=final_confidence,
            ocr_engine=final_engine,
            fallback_used=fallback_used,
        )
    else:
        save_prescription_ocr_result(
            image_id=image_id,
            raw_text=final_text,
            parsed_data=final_parsed,
            confidence=final_confidence,
            ocr_engine=final_engine,
            fallback_used=fallback_used,
        )

    print("[OCR ✅] OCR pipeline completed successfully")
    print(f"[OCR] Final engine: {final_engine}")
    print(f"[OCR] Final confidence: {final_confidence:.3f}")
    print("================ OCR PIPELINE END =================\n")
