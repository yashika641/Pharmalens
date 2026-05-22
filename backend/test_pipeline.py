"""
Full OCR pipeline test — mirrors the exact logic in models/ocr/main.py
but reads images from a local folder and writes results to CSV.

Nothing in the existing codebase is modified.

Usage:
    python test_pipeline.py                          # medicine, test_images/
    python test_pipeline.py path/to/images           # medicine, custom folder
    python test_pipeline.py path/to/images prescription
"""

import sys
import csv
import re
import time
import asyncio
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv(Path(__file__).parent / ".env")
sys.path.insert(0, str(Path(__file__).parent.parent))

# ── import exactly what main.py uses — zero changes to those files ─────────────
from backend.models.ocr.paddle_ocr import run_paddle_ocr
from backend.models.ocr.easy_ocr   import run_ocr_space
from backend.models.ocr.parsers    import (
    compress_image_for_ocr_space,
    parse_medicine,
    parse_prescription,
    needs_llm_fallback,
    needs_prescription_llm_fallback,
    gemini_extract_medicine,
    gemini_extract_prescription,
    merge_results,
    merge_results_prescription,
)

# ── Config (must match main.py) ────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.80

TEST_DIR    = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "test_images"
IMAGE_TYPE  = sys.argv[2].lower() if len(sys.argv) > 2 else "prescription"
RESULTS_DIR = Path(__file__).parent / "results"
SUPPORTED   = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

assert IMAGE_TYPE in ("medicine", "prescription"), \
    "Image type must be 'medicine' or 'prescription'"

# ── CSV columns ────────────────────────────────────────────────────────────────
MEDICINE_FIELDS     = ["medicine_name", "dosage", "composition",
                       "medicine_type", "expiry_date", "mfg_date", "precautions"]
PRESCRIPTION_FIELDS = ["doctor_name", "prescription_date",
                       "diagnosis", "medicines", "routes"]

BASE_COLS = [
    "file", "image_type",
    # Layer 1
    "paddle_confidence", "paddle_time_s", "paddle_raw_text",
    # Layer 2
    "ocrspace_triggered", "ocrspace_confidence", "ocrspace_time_s", "ocrspace_raw_text",
    # Layer 3
    "gemini_triggered", "gemini_time_s",
    # Final
    "final_engine", "final_confidence", "fallback_used", "final_raw_text",
]

PARSED_COLS = MEDICINE_FIELDS if IMAGE_TYPE == "medicine" else PRESCRIPTION_FIELDS
CSV_COLS    = BASE_COLS + PARSED_COLS

# ── Helpers ────────────────────────────────────────────────────────────────────
def sep(char="─", w=72): print(char * w)
def hdr(t): sep("═"); print(f"  {t}"); sep("═")

def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+", "", text)
    return re.sub(r"\s+", " ", text).strip()

def safe_str(v) -> str:
    if v is None or v == "" or v == [] or v == {}: return ""
    return json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)

def parse(text: str) -> dict:
    return parse_medicine(text) if IMAGE_TYPE == "medicine" \
           else parse_prescription(text)

def needs_fallback(parsed: dict) -> bool:
    return needs_llm_fallback(parsed) if IMAGE_TYPE == "medicine" \
           else needs_prescription_llm_fallback(parsed)

async def run_gemini(text: str, image_bytes: bytes) -> dict:
    if IMAGE_TYPE == "medicine":
        return await gemini_extract_medicine(ocr_text=text, image_bytes=image_bytes)
    return await gemini_extract_prescription(ocr_text=text, image_bytes=image_bytes)

def merge(primary: dict, gemini: dict) -> dict:
    return merge_results(primary, gemini) if IMAGE_TYPE == "medicine" \
           else merge_results_prescription(primary, gemini)

# ── Per-image pipeline (mirrors main.py exactly) ───────────────────────────────
async def run_pipeline(img_path: Path) -> dict:
    sep()
    print(f"  📄 {img_path.name}")
    sep()

    image_bytes = img_path.read_bytes()

    row = {
        "file":             img_path.name,
        "image_type":       IMAGE_TYPE,
        "paddle_confidence":  0.0, "paddle_time_s":    0.0, "paddle_raw_text":   "",
        "ocrspace_triggered": "No", "ocrspace_confidence": 0.0,
        "ocrspace_time_s":    0.0,  "ocrspace_raw_text":   "",
        "gemini_triggered":   "No", "gemini_time_s":       0.0,
        "final_engine":     "", "final_confidence": 0.0,
        "fallback_used":    "No",   "final_raw_text":      "",
        **{f: "" for f in PARSED_COLS},
    }

    # ── Layer 1: PaddleOCR ─────────────────────────────────────────────────────
    print("  [1] PaddleOCR …")
    t0 = time.perf_counter()
    try:
        primary_text, primary_conf = run_paddle_ocr(image_bytes)
    except Exception as e:
        print(f"      ❌ PaddleOCR failed: {e}")
        primary_text, primary_conf = "", 0.0

    paddle_time = round(time.perf_counter() - t0, 3)
    clean_paddle = strip_html(primary_text)

    print(f"      Confidence : {primary_conf:.3f}   Time: {paddle_time}s")
    print(f"      Text       : {clean_paddle[:120] or '(empty)'}")

    row["paddle_confidence"] = round(primary_conf, 4)
    row["paddle_time_s"]     = paddle_time
    row["paddle_raw_text"]   = clean_paddle

    primary_parsed  = parse(primary_text)
    final_text      = primary_text
    final_parsed    = primary_parsed
    final_conf      = primary_conf
    final_engine    = "paddleocr"
    fallback_used   = False

    # ── Layer 2: OCR.Space ─────────────────────────────────────────────────────
    if primary_conf < CONFIDENCE_THRESHOLD:
        print(f"\n  [2] OCR.Space  (triggered — paddle conf {primary_conf:.3f} < {CONFIDENCE_THRESHOLD}) …")
        fallback_used = True
        row["ocrspace_triggered"] = "Yes"
        row["fallback_used"]      = "Yes"

        t1 = time.perf_counter()
        try:
            compressed  = compress_image_for_ocr_space(image_bytes)
            fb_text, fb_conf = run_ocr_space(compressed)
        except Exception as e:
            print(f"      ❌ OCR.Space failed: {e}")
            fb_text, fb_conf = "", 0.0

        ocrspace_time = round(time.perf_counter() - t1, 3)
        print(f"      Confidence : {fb_conf:.3f}   Time: {ocrspace_time}s")
        print(f"      Text       : {fb_text[:120] or '(empty)'}")

        row["ocrspace_confidence"] = round(fb_conf, 4)
        row["ocrspace_time_s"]     = ocrspace_time
        row["ocrspace_raw_text"]   = fb_text

        if fb_conf > primary_conf:
            print("      ✅ OCR.Space selected as final")
            fb_parsed    = parse(fb_text)
            final_text   = fb_text
            final_parsed = fb_parsed
            final_conf   = fb_conf
            final_engine = "ocr_space"
        else:
            print("      PaddleOCR retained (higher confidence)")
    else:
        print(f"\n  [2] OCR.Space  — skipped (paddle conf {primary_conf:.3f} ≥ {CONFIDENCE_THRESHOLD})")

    # ── Layer 3: Gemini ────────────────────────────────────────────────────────
    if needs_fallback(final_parsed):
        print(f"\n  [3] Gemini Vision  (triggered — missing required fields) …")
        fallback_used = True
        row["gemini_triggered"] = "Yes"
        row["fallback_used"]    = "Yes"

        t2 = time.perf_counter()
        try:
            gemini_data  = await run_gemini(final_text, image_bytes)
            final_parsed = merge(final_parsed, gemini_data)
            final_engine = f"{final_engine}+gemini"
        except Exception as e:
            print(f"      ❌ Gemini failed: {e}")
            gemini_data = {}

        gemini_time = round(time.perf_counter() - t2, 3)
        print(f"      Time       : {gemini_time}s")
        row["gemini_time_s"] = gemini_time
    else:
        print(f"\n  [3] Gemini Vision  — skipped (required fields present)")

    # ── Final ──────────────────────────────────────────────────────────────────
    row["final_engine"]     = final_engine
    row["final_confidence"] = round(final_conf, 4)
    row["fallback_used"]    = "Yes" if fallback_used else "No"
    row["final_raw_text"]   = strip_html(final_text)

    for f in PARSED_COLS:
        row[f] = safe_str(final_parsed.get(f))

    print(f"\n  ✅ Engine: {final_engine}   Conf: {final_conf:.3f}   Fallback: {fallback_used}")
    print(f"  Parsed fields: " +
          "  ".join(f"{f}={row[f]!r}" for f in PARSED_COLS if row[f]))

    return row

# ── Main ───────────────────────────────────────────────────────────────────────
async def main():
    hdr(f"Full OCR Pipeline Test — {IMAGE_TYPE.upper()}")
    print(f"  Folder     : {TEST_DIR}")
    print(f"  Image type : {IMAGE_TYPE}")
    print(f"  Threshold  : paddle conf < {CONFIDENCE_THRESHOLD} → OCR.Space")
    print(f"  Gemini     : triggered if required fields still missing\n")

    if not TEST_DIR.exists():
        print(f"❌ Folder not found: {TEST_DIR}"); sys.exit(1)

    images = sorted(f for f in TEST_DIR.iterdir() if f.suffix.lower() in SUPPORTED)
    if not images:
        print(f"❌ No images found in {TEST_DIR}"); sys.exit(1)

    print(f"  {len(images)} image(s) found\n")

    rows = []
    bar  = tqdm(images, desc="Overall", unit="img", dynamic_ncols=True)
    for img_path in bar:
        bar.set_postfix(file=img_path.name)
        row = await run_pipeline(img_path)
        rows.append(row)
        tqdm.write("")

    # ── Console summary ────────────────────────────────────────────────────────
    hdr("PIPELINE SUMMARY")
    print(f"  {'File':<30} {'Engine':<22} {'Conf':>6} {'OCRSp':>6} {'Gem':>5}")
    sep()
    for r in rows:
        print(f"  {r['file']:<30} {r['final_engine']:<22} "
              f"{r['final_confidence']:>6.3f} "
              f"{r['ocrspace_triggered']:>6} "
              f"{r['gemini_triggered']:>5}")

    sep()
    n = len(rows)
    if n:
        avg_conf    = sum(r["final_confidence"]                        for r in rows) / n
        ocrs_count  = sum(1 for r in rows if r["ocrspace_triggered"] == "Yes")
        gem_count   = sum(1 for r in rows if r["gemini_triggered"]   == "Yes")
        fb_count    = sum(1 for r in rows if r["fallback_used"]      == "Yes")
        print(f"\n  Images       : {n}")
        print(f"  Avg conf     : {avg_conf:.3f}")
        print(f"  OCR.Space    : triggered {ocrs_count}/{n} times")
        print(f"  Gemini       : triggered {gem_count}/{n} times")
        print(f"  Fallback     : used on {fb_count}/{n} images")

    sep("═")

    # ── Save CSV ───────────────────────────────────────────────────────────────
    RESULTS_DIR.mkdir(exist_ok=True)
    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = RESULTS_DIR / f"pipeline_{IMAGE_TYPE}_{ts}.csv"

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n💾 CSV saved → {csv_path}")


if __name__ == "__main__":
    asyncio.run(main())
