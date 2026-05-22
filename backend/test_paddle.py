"""
Standalone test: PaddleOCR (Layer 1) — OCR metrics only
Run from backend/: python test_paddle.py [path/to/test_images]
Results saved to: backend/results/paddle_results_<timestamp>.xlsx
"""

import sys
import re
import csv
import time
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.ocr.paddle_ocr import run_paddle_ocr

TEST_DIR    = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "test_images"
RESULTS_DIR = Path(__file__).parent / "results"
SUPPORTED   = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

# ── Text quality helpers ───────────────────────────────────────────────────────
def strip_html(text: str) -> str:
    """Remove HTML tags and embedded image URLs PaddleOCR sometimes returns."""
    text = re.sub(r'<[^>]+>', ' ', text)          # strip tags
    text = re.sub(r'https?://\S+', '', text)       # strip URLs
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def text_quality(raw: str) -> str:
    """Flag whether PaddleOCR returned clean text or HTML garbage."""
    if re.search(r'<div|<img|<p |bce-auth', raw):
        return "HTML/garbage"
    return "clean"

def trunc(text: str, n: int = 300) -> str:
    t = text.replace("\n", " ").strip()
    return t[:n] + "…" if len(t) > n else t

def sep(char="─", w=70): print(char * w)
def hdr(t): sep("═"); print(f"  {t}"); sep("═")

# ── CSV export ─────────────────────────────────────────────────────────────────
CSV_FIELDS = ["file", "status", "confidence", "elapsed",
              "chars", "words", "lines", "chars_per_sec", "quality", "preview"]

def export_csv(results: list, out_path: Path):
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for r in results:
            writer.writerow({
                "file":          r["file"],
                "status":        "PASS" if r["success"] else "FAIL",
                "confidence":    round(r["confidence"], 4),
                "elapsed":       round(r["elapsed"], 3),
                "chars":         r["chars"],
                "words":         r["words"],
                "lines":         r["lines"],
                "chars_per_sec": round(r["chars_per_sec"], 1),
                "quality":       r["quality"],
                "preview":       r["preview"],
            })
    print(f"\n💾 CSV saved → {out_path}")

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    hdr("PaddleOCR Layer 1 — Prescription OCR Test")
    print(f"  Folder : {TEST_DIR}\n")

    if not TEST_DIR.exists():
        print(f"❌ Folder not found: {TEST_DIR}"); sys.exit(1)

    images = sorted(f for f in TEST_DIR.iterdir() if f.suffix.lower() in SUPPORTED)
    if not images:
        print(f"❌ No images in {TEST_DIR}"); sys.exit(1)

    print(f"  {len(images)} image(s) found\n")
    results = []

    for img_path in images:
        sep()
        print(f"  📄 {img_path.name}")
        sep()

        image_bytes = img_path.read_bytes()
        start = time.perf_counter()

        try:
            raw_text, confidence = run_paddle_ocr(image_bytes)
            elapsed = time.perf_counter() - start
        except Exception as e:
            elapsed = time.perf_counter() - start
            print(f"  ❌ {e}")
            results.append({
                "file": img_path.name, "success": False,
                "confidence": 0.0, "elapsed": round(elapsed, 3),
                "chars": 0, "words": 0, "lines": 0,
                "chars_per_sec": 0.0, "quality": "error", "preview": "",
            })
            continue

        clean_text    = strip_html(raw_text)
        quality       = text_quality(raw_text)
        chars         = len(clean_text)
        words         = len(clean_text.split())
        lines         = len([l for l in clean_text.splitlines() if l.strip()])
        chars_per_sec = chars / elapsed if elapsed > 0 else 0

        print(f"  ✅ Confidence   : {confidence:.3f}")
        print(f"  ⏱  Time         : {elapsed:.2f}s")
        print(f"  📝 Chars        : {chars}   Words: {words}   Lines: {lines}")
        print(f"  🚀 Chars/sec    : {chars_per_sec:.0f}")
        print(f"  🔍 Text quality : {quality}")
        print(f"\n  Preview : {trunc(clean_text)}\n")

        results.append({
            "file": img_path.name, "success": True,
            "confidence": confidence, "elapsed": round(elapsed, 3),
            "chars": chars, "words": words, "lines": lines,
            "chars_per_sec": round(chars_per_sec, 1),
            "quality": quality, "preview": trunc(clean_text, 500),
        })

    # Console summary
    print(); hdr("SUMMARY — PaddleOCR")
    print(f"  {'File':<32} {'Status':>6} {'Conf':>7} {'Time':>7} {'Chars':>7} {'Words':>6} {'Lines':>6} {'Quality'}")
    sep()

    sr = []
    for r in results:
        st = "PASS" if r["success"] else "FAIL"
        print(f"  {r['file']:<32} {st:>6} {r['confidence']:>7.3f} "
              f"{r['elapsed']:>6.2f}s {r['chars']:>7} {r['words']:>6} "
              f"{r['lines']:>6}  {r['quality']}")
        if r["success"]: sr.append(r)

    n = len(sr)
    if n:
        sep()
        print(f"  {'AVERAGE':<32} {'':>6} "
              f"{sum(r['confidence'] for r in sr)/n:>7.3f} "
              f"{sum(r['elapsed'] for r in sr)/n:>6.2f}s "
              f"{sum(r['chars'] for r in sr)//n:>7} "
              f"{sum(r['words'] for r in sr)//n:>6} "
              f"{sum(r['lines'] for r in sr)//n:>6}")

    print(f"\n  Total: {len(images)}  Pass: {n}  Fail: {len(images)-n}")
    sep("═")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_csv(results, RESULTS_DIR / f"paddle_prescription_{ts}.csv")


if __name__ == "__main__":
    main()
