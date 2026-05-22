"""
Standalone test: Gemini Vision (Layer 3) — Prescription extraction metrics only
Run from backend/: python test_gemini.py [path/to/test_images]
Results saved to: backend/results/gemini_results_<timestamp>.csv
"""

import sys
import csv
import time
import asyncio
import json
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.ocr.parsers import gemini_extract_prescription

TEST_DIR    = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "test_images"
RESULTS_DIR = Path(__file__).parent / "results"
SUPPORTED   = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

PRESCRIPTION_FIELDS = ["doctor_name", "prescription_date",
                       "diagnosis", "medicines", "routes"]

# ── Helpers ────────────────────────────────────────────────────────────────────
def sep(char="─", w=70): print(char * w)
def hdr(t): sep("═"); print(f"  {t}"); sep("═")

def count_filled(d: dict) -> int:
    if not isinstance(d, dict): return 0
    return sum(1 for v in d.values() if v is not None and v != "" and v != [] and v != {})

def safe_str(v) -> str | None:
    if v is None or v == "" or v == [] or v == {}: return None
    return json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)

# ── CSV export ─────────────────────────────────────────────────────────────────
CSV_FIELDS = (["file", "status", "confidence", "elapsed", "fields_found", "fill_pct"]
              + PRESCRIPTION_FIELDS + ["raw_json"])

def export_csv(results: list, out_path: Path):
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for r in results:
            writer.writerow({
                "file":         r["file"],
                "status":       "PASS" if r["success"] else "FAIL",
                "confidence":   round(r["confidence"], 4),
                "elapsed":      round(r["elapsed"], 3),
                "fields_found": r["fields_found"],
                "fill_pct":     f"{r['fill_pct']:.0%}",
                **{f: r[f] or "" for f in PRESCRIPTION_FIELDS},
                "raw_json":     r["raw_json"],
            })
    print(f"\n💾 CSV saved → {out_path}")

# ── Per-image test ─────────────────────────────────────────────────────────────
async def test_image(img_path: Path) -> dict:
    image_bytes = img_path.read_bytes()

    sep()
    print(f"  📄 {img_path.name}   ({len(image_bytes)/1024:.0f} KB)")
    sep()

    start = time.perf_counter()
    try:
        result  = await gemini_extract_prescription(ocr_text="", image_bytes=image_bytes)
        elapsed = time.perf_counter() - start
        success = True
    except Exception as e:
        elapsed = time.perf_counter() - start
        print(f"  ❌ {e}")
        return {
            "file": img_path.name, "success": False,
            "confidence": 0.0, "elapsed": round(elapsed, 3),
            "fields_found": 0, "fill_pct": 0.0, "raw_json": "",
            **{f: None for f in PRESCRIPTION_FIELDS},
        }

    fields_found = count_filled(result)
    fill_pct     = fields_found / len(PRESCRIPTION_FIELDS)
    confidence   = round(fill_pct, 4)          # fill rate used as confidence proxy
    raw_json     = json.dumps(result, indent=2, ensure_ascii=False)

    print(f"  ✅ Confidence   : {confidence:.3f}  (fill rate — Gemini has no numeric score)")
    print(f"  ⏱  Time         : {elapsed:.2f}s")
    print(f"  📊 Fields found : {fields_found}/{len(PRESCRIPTION_FIELDS)}  ({fill_pct:.0%})")
    print(f"\n  Raw JSON output:")
    for line in raw_json.splitlines():
        print(f"    {line}")
    print()
    for f in PRESCRIPTION_FIELDS:
        v    = result.get(f)
        mark = "✔" if (v is not None and v != "" and v != [] and v != {}) else "✘"
        disp = safe_str(v) or "-"
        if len(disp) > 80: disp = disp[:80] + "…"
        print(f"    {mark} {f:<25} {disp}")

    return {
        "file": img_path.name, "success": success,
        "confidence": confidence, "elapsed": round(elapsed, 3),
        "fields_found": fields_found, "fill_pct": fill_pct,
        "raw_json": raw_json,
        **{f: safe_str(result.get(f)) for f in PRESCRIPTION_FIELDS},
    }

# ── Main ───────────────────────────────────────────────────────────────────────
async def main():
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        print("❌ GEMINI_API_KEY not set in .env"); sys.exit(1)

    hdr("Gemini Vision Layer 3 — Prescription OCR Test")
    print(f"  Folder  : {TEST_DIR}")
    print(f"  Model   : gemini-2.5-flash")
    print(f"  API key : {api_key[:8]}{'*'*10}\n")

    if not TEST_DIR.exists():
        print(f"❌ Folder not found: {TEST_DIR}"); sys.exit(1)

    images = sorted(f for f in TEST_DIR.iterdir() if f.suffix.lower() in SUPPORTED)
    if not images:
        print(f"❌ No images in {TEST_DIR}"); sys.exit(1)

    print(f"  {len(images)} image(s) found\n")

    results = []
    for img_path in images:
        r = await test_image(img_path)
        results.append(r)

    # Console summary
    print(); hdr("SUMMARY — Gemini Vision")
    print(f"  {'File':<32} {'Status':>6} {'Conf':>6} {'Time':>7} {'Fields':>8} {'Fill%':>7}")
    sep()

    sr = []
    for r in results:
        st = "PASS" if r["success"] else "FAIL"
        print(f"  {r['file']:<32} {st:>6} {r['confidence']:>6.3f} "
              f"{r['elapsed']:>6.2f}s {r['fields_found']:>8} {r['fill_pct']:>7.0%}")
        if r["success"]: sr.append(r)

    n = len(sr)
    if n:
        sep()
        print(f"  {'AVERAGE':<32} {'':>6} "
              f"{sum(r['confidence'] for r in sr)/n:>6.3f} "
              f"{sum(r['elapsed'] for r in sr)/n:>6.2f}s "
              f"{sum(r['fields_found'] for r in sr)/n:>8.1f} "
              f"{sum(r['fill_pct'] for r in sr)/n:>7.0%}")

    print(f"\n  Total: {len(images)}  Pass: {n}  Fail: {len(images)-n}")
    sep("═")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_csv(results, RESULTS_DIR / f"gemini_prescription_{ts}.csv")


if __name__ == "__main__":
    asyncio.run(main())
