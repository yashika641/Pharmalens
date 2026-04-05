import asyncio
import os
import requests

from backend.utils.supabase import get_supabase
from backend.models.ocr.paddle_ocr import run_paddle_ocr
from backend.models.ocr.easy_ocr import run_ocr_space
from backend.models.ocr.parsers import (
    compress_image_for_ocr_space,
    merge_results_prescription,
    needs_prescription_llm_fallback,
    parse_medicine,
    parse_prescription,
    needs_llm_fallback,
    gemini_extract_medicine,
    merge_results,
    gemini_extract_prescription,
)
from backend.models.ocr.supabase_databse_update import (
    save_medicine_ocr_result,
    save_prescription_ocr_result,
)
from backend.models.ocr.exceptions import OCREngineError


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
async def run_latest_image_ocr_pipeline(user_id: str) -> None:
    # sourcery skip: low-code-quality
    print("\n================ OCR PIPELINE START ================")
    print(f"[OCR] User ID: {user_id}")

    # -------------------------------------------------
    # 1️⃣ Fetch latest image
    # -------------------------------------------------
    print("[OCR] Fetching latest image from Supabase...")
    supabase = get_supabase()
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
    image_id   = str(image["id"])# type: ignore
    image_type = str(image["image_type"])   # type: ignore
    image_url  = str(image["image_url"])   # type: ignore

    print(f"[OCR] Image ID: {image_id}")
    print(f"[OCR] Image Type: {image_type}")

    # -------------------------------------------------
    # 2️⃣ Download image  (keep bytes for Gemini Vision)
    # -------------------------------------------------
    image_bytes = _download_image(image_url)

    # -------------------------------------------------
    # 3️⃣ PRIMARY OCR – PaddleOCR
    # -------------------------------------------------
    print("[OCR] Running PaddleOCR (primary)...")

    try:
        primary_text, primary_conf = run_paddle_ocr(image_bytes)
    except Exception as e:
        print(f"[OCR WARNING] PaddleOCR failed entirely: {e}")
        primary_text = ""
        primary_conf = 0.0

    print(f"[OCR] PaddleOCR confidence: {primary_conf:.3f}")
    print(f"[OCR] PaddleOCR text: {primary_text!r}")
    _save_raw_ocr_locally(image_id, "paddle_primary", primary_text)

    if image_type == "medicine":
        primary_parsed = parse_medicine(primary_text)
    else:
        primary_parsed = parse_prescription(primary_text)

    final_text       = primary_text
    final_parsed     = primary_parsed
    final_confidence = primary_conf
    final_engine     = "paddleocr"
    fallback_used    = False

    # -------------------------------------------------
    # 4️⃣ FALLBACK OCR – OCR.Space
    # -------------------------------------------------
    if primary_conf < CONFIDENCE_THRESHOLD:
        print("[OCR] Running OCR.Space fallback...")
        fallback_used = True

        try:
            # FIX: compress then send raw bytes with correct content-type
            compressed_bytes = compress_image_for_ocr_space(image_bytes)
            fallback_text, fallback_conf = run_ocr_space(compressed_bytes)
            print(f"[OCR] OCR.Space confidence: {fallback_conf:.3f}")
            print(f"[OCR] OCR.Space text: {fallback_text!r}")
        except Exception as e:
            print(f"[OCR ⚠️] OCR.Space failed: {e}")
            fallback_text = ""
            fallback_conf = 0.0

        _save_raw_ocr_locally(image_id, "ocr_space_fallback", fallback_text)

        if fallback_conf > primary_conf:
            print("[OCR] OCR.Space selected as final result")

            if image_type == "medicine":
                fallback_parsed = parse_medicine(fallback_text)
            else:
                fallback_parsed = parse_prescription(fallback_text)

            final_text       = fallback_text
            final_parsed     = fallback_parsed
            final_confidence = fallback_conf
            final_engine     = "ocr_space"
        else:
            print("[OCR] PaddleOCR retained")

    # -------------------------------------------------
    # 5️⃣ Gemini Vision fallback if fields still missing
    #    FIX: always pass image_bytes to Gemini — never
    #    rely on final_text which may be empty/garbage
    # -------------------------------------------------
    print("[OCR] Checking parsed fields...")

    if image_type == "medicine" and needs_llm_fallback(final_parsed):
        print("[OCR ⚠️] Missing fields detected, running Gemini Vision fallback")

        # FIX: pass image_bytes directly so Gemini reads the image,
        # not an empty string from failed OCR engines
        gemini_data = await gemini_extract_medicine(
            ocr_text=final_text,
            image_bytes=image_bytes,  # ← ADD THIS PARAMETER
        )

        print("PRIMARY PARSED:", final_parsed)
        print("GEMINI PARSED:", gemini_data)

        final_parsed  = merge_results(final_parsed, gemini_data)
        fallback_used = True
        final_engine  = f"{final_engine}+gemini"

        print("[OCR] Final parsed data after Gemini merge:", final_parsed)

    elif image_type == "prescription" and needs_prescription_llm_fallback(final_parsed):
        print("[OCR ⚠️] Missing prescription fields, running Gemini Vision fallback")

        gemini_data = await gemini_extract_prescription(
            ocr_text=final_text,
            image_bytes=image_bytes,  # ← ADD THIS PARAMETER
        )

        print("PRIMARY PARSED:", final_parsed)
        print("GEMINI PARSED:", gemini_data)

        final_parsed  = merge_results_prescription(final_parsed, gemini_data)
        fallback_used = True
        final_engine  = f"{final_engine}+gemini"

        print("final_parsed after merge:", final_parsed)

    # -------------------------------------------------
    # 6️⃣ Persist result
    # -------------------------------------------------
    print("[OCR] Saving OCR result to Supabase...")

    if image_type == "medicine":
        save_medicine_ocr_result(
            image_id=image_id,
            user_id=user_id,
            raw_text=final_text,
            parsed_data=final_parsed,
            confidence=final_confidence,
            ocr_engine=final_engine,
            fallback_used=fallback_used,
        )
    else:
        save_prescription_ocr_result(
            image_id=image_id,
            user_id=user_id,
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