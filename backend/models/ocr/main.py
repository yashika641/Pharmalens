import asyncio
import os
import requests

from backend.utils.supabase import get_supabase
from backend.utils.supabase import get_supabase

from backend.models.ocr.paddle_ocr import run_paddle_ocr
from backend.models.ocr.easy_ocr import run_ocr_space
from backend.models.ocr.parsers import  compress_image_for_ocr_space,merge_results_prescription,needs_prescription_llm_fallback, parse_medicine, parse_prescription, needs_llm_fallback, gemini_extract_medicine, merge_results , gemini_extract_prescription
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
    print("primary text ", primary_text)
    # -------------------------------------------------
    # 4️⃣ FALLBACK OCR – EasyOCR
    # -------------------------------------------------
    if primary_conf < CONFIDENCE_THRESHOLD:
    
        print("[OCR] Running OCR.Space fallback...")

        fallback_used = True

        compressed_bytes = compress_image_for_ocr_space(image_bytes)
        try:
            fallback_text, fallback_conf = run_ocr_space(compressed_bytes)
        except Exception as e:
            print("[OCR ⚠️] OCR.Space failed:", e)
            fallback_text = ""
            fallback_conf = 0.0

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
    # 5️⃣ LLM fallback if fields missing
    # -------------------------------------------------
    print("[OCR] Checking parsed fields...")

    if image_type == "medicine" and needs_llm_fallback(final_parsed):

        print("[OCR ⚠️] Missing fields detected, running Gemini fallback")

        gemini_data = await gemini_extract_medicine(final_text)
        print("PRIMARY PARSED:", final_parsed)
        print("GEMINI PARSED:", gemini_data)
        final_parsed = merge_results(final_parsed, gemini_data)
        print("[OCR] Gemini fallback data merged")
        print("[OCR] Final parsed data after Gemini merge:", final_parsed)
        fallback_used = True

        final_engine = f"{final_engine}+gemini"

        print("[OCR] Gemini extraction merged")
        
    elif image_type == "prescription" and needs_prescription_llm_fallback(final_parsed):
    
        print("[OCR ⚠️] Missing prescription fields detected, running Gemini fallback")

        gemini_data = await gemini_extract_prescription(final_text)

        print("PRIMARY PARSED:", final_parsed)
        print("GEMINI PARSED:", gemini_data)

        final_parsed = merge_results_prescription(final_parsed, gemini_data)

        fallback_used = True
        final_engine = f"{final_engine}+gemini"
        print("final_parsed after merge:", final_parsed)
        print("[OCR] Gemini prescription extraction merged")
    # -------------------------------------------------
    # 5️⃣ Persist result
    # -------------------------------------------------
    print("[OCR] Saving OCR result to Supabase...")

        
    if image_type == "medicine":
        save_medicine_ocr_result(
            image_id=image_id,
            user_id=user_id,        # ✅ add this
            raw_text=final_text,
            parsed_data=final_parsed,
            confidence=final_confidence,
            ocr_engine=final_engine,
            fallback_used=fallback_used,
        )
    else:
        save_prescription_ocr_result(
            image_id=image_id,
            user_id=user_id,        # ✅ add this
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
