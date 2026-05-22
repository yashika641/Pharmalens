"""
Pipeline test — calls the REAL run_latest_image_ocr_pipeline from main.py
on local test images, without uploading anything to Supabase.

Only the Supabase image-fetch and DB-save calls are mocked.
All OCR layers (PaddleOCR / OCR.Space / Gemini) run exactly as in production.

Usage:
    python test_pipeline_real.py                         # medicine, test_images/
    python test_pipeline_real.py path/to/images          # medicine, custom folder
    python test_pipeline_real.py path/to/images prescription
"""

import sys
import csv
import json
import asyncio
import uuid
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv(Path(__file__).parent / ".env")
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.ocr.main import run_latest_image_ocr_pipeline

# ── Config ─────────────────────────────────────────────────────────────────────
TEST_DIR    = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "test_images"
IMAGE_TYPE  = sys.argv[2].lower() if len(sys.argv) > 2 else "prescription"
RESULTS_DIR = Path(__file__).parent / "results"
SUPPORTED   = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

assert IMAGE_TYPE in ("medicine", "prescription"), \
    "Image type must be 'medicine' or 'prescription'"

MEDICINE_FIELDS     = ["medicine_name", "dosage", "composition",
                       "medicine_type", "expiry_date", "mfg_date", "precautions"]
PRESCRIPTION_FIELDS = ["doctor_name", "prescription_date",
                       "diagnosis", "medicines", "routes"]
PARSED_COLS = MEDICINE_FIELDS if IMAGE_TYPE == "medicine" else PRESCRIPTION_FIELDS

CSV_COLS = [
    "file", "image_type",
    "final_engine", "final_confidence", "fallback_used", "final_raw_text",
] + PARSED_COLS

# ── Helpers ─────────────────────────────────────────────────────────────────────
def sep(char="─", w=72): print(char * w)
def hdr(t): sep("═"); print(f"  {t}"); sep("═")

def safe_str(v) -> str:
    if v is None or v == "" or v == [] or v == {}: return ""
    return json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)

def make_mock_supabase(image_type: str, fake_id: str) -> MagicMock:
    """Fluent-chain mock that returns one fake image record."""
    record = {
        "id":         fake_id,
        "image_type": image_type,
        "image_url":  "http://local/fake",
        "user_id":    "test-user",
    }
    execute_result      = MagicMock()
    execute_result.data = [record]

    chain = MagicMock()
    chain.select.return_value  = chain
    chain.eq.return_value      = chain
    chain.order.return_value   = chain
    chain.limit.return_value   = chain
    chain.execute.return_value = execute_result

    mock_sb = MagicMock()
    mock_sb.table.return_value = chain
    return mock_sb

# ── Per-image run ───────────────────────────────────────────────────────────────
async def run_one(img_path: Path) -> dict:
    sep()
    print(f"  {img_path.name}")
    sep()

    image_bytes   = img_path.read_bytes()
    fake_id       = str(uuid.uuid4())
    result_holder: dict = {}

    def _capture(image_id, user_id, raw_text, parsed_data,
                 confidence, ocr_engine, fallback_used):
        result_holder.update({
            "final_engine":     ocr_engine,
            "final_confidence": round(float(confidence), 4),
            "fallback_used":    "Yes" if fallback_used else "No",
            "final_raw_text":   raw_text,
            "parsed":           parsed_data or {},
        })

    with patch("backend.models.ocr.main.get_supabase",
               return_value=make_mock_supabase(IMAGE_TYPE, fake_id)), \
         patch("backend.models.ocr.main._download_image",
               return_value=image_bytes), \
         patch("backend.models.ocr.main.save_medicine_ocr_result",
               side_effect=_capture), \
         patch("backend.models.ocr.main.save_prescription_ocr_result",
               side_effect=_capture):

        await run_latest_image_ocr_pipeline("test-user")

    parsed = result_holder.get("parsed", {})
    row = {
        "file":             img_path.name,
        "image_type":       IMAGE_TYPE,
        "final_engine":     result_holder.get("final_engine", ""),
        "final_confidence": result_holder.get("final_confidence", 0.0),
        "fallback_used":    result_holder.get("fallback_used", "No"),
        "final_raw_text":   result_holder.get("final_raw_text", ""),
        **{f: safe_str(parsed.get(f)) for f in PARSED_COLS},
    }

    print(f"\n  Engine: {row['final_engine']}  "
          f"Conf: {row['final_confidence']}  "
          f"Fallback: {row['fallback_used']}")
    print("  Parsed: " + "  ".join(f"{f}={row[f]!r}" for f in PARSED_COLS if row[f]))
    return row

# ── Main ────────────────────────────────────────────────────────────────────────
async def main():
    hdr(f"Real OCR Pipeline Test — {IMAGE_TYPE.upper()}")
    print(f"  Folder     : {TEST_DIR}")
    print(f"  Image type : {IMAGE_TYPE}\n")

    if not TEST_DIR.exists():
        print(f"Folder not found: {TEST_DIR}"); sys.exit(1)

    images = sorted(f for f in TEST_DIR.iterdir() if f.suffix.lower() in SUPPORTED)
    if not images:
        print(f"No images in {TEST_DIR}"); sys.exit(1)

    print(f"  {len(images)} image(s) found\n")

    rows = []
    bar  = tqdm(images, desc="Overall", unit="img", dynamic_ncols=True)
    for img_path in bar:
        bar.set_postfix(file=img_path.name)
        row = await run_one(img_path)
        rows.append(row)
        tqdm.write("")

    hdr("SUMMARY")
    print(f"  {'File':<30} {'Engine':<24} {'Conf':>6}  Fallback")
    sep()
    for r in rows:
        print(f"  {r['file']:<30} {r['final_engine']:<24} "
              f"{r['final_confidence']:>6.3f}  {r['fallback_used']}")

    sep("═")
    RESULTS_DIR.mkdir(exist_ok=True)
    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = RESULTS_DIR / f"pipeline_real_{IMAGE_TYPE}_{ts}.csv"

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n  CSV saved → {csv_path}")


if __name__ == "__main__":
    asyncio.run(main())
