import os
import io
import tempfile
import time
from PIL import Image
try:
    from gradio_client import Client, handle_file
except ImportError:
    # Fallback or placeholder if gradio_client is not installed in the environment
    Client = None
    handle_file = None

from backend.models.ocr.exceptions import OCREngineError

# =========================
# INIT CLIENT (ONCE)
# =========================
# paddle_ocr.py

_paddle_client = None

def get_paddle_client():
    global _paddle_client
    if _paddle_client is None:
        if Client is None:
            raise OCREngineError("gradio_client is not installed. Please run 'pip install gradio_client'.")
        _paddle_client = Client(
            "PaddlePaddle/PaddleOCR-VL-1.5_Online_Demo",
            # timeout=60,
        )
    return _paddle_client


def _save_temp_image(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    image.save(tmp.name)
    tmp.close()
    return tmp.name


def run_paddle_ocr(image_bytes: bytes) -> tuple[str, float]:
    
    temp_path = None
    max_retries = 3

    for attempt in range(max_retries):
        try:
            client = get_paddle_client()

            if handle_file is None:
                raise OCREngineError("gradio_client.handle_file could not be resolved.")

            if not temp_path:
                temp_path = _save_temp_image(image_bytes)

            markdown_output, _, _ = client.predict(
                fp=handle_file(temp_path),
                ch=False,
                uw=False,
                do=True,
                api_name="/parse_doc"
            )

            if not markdown_output:
                return "", 0.0

            lines = [
                line.strip()
                for line in markdown_output.splitlines()
                if line.strip()
            ]

            text = "\n".join(lines)
            confidence = min(0.95, 0.6 + 0.01 * len(lines))

            return text, round(confidence, 3)

        except Exception as e:
            if "504" in str(e) and attempt < max_retries - 1:
                print(f"PaddleOCR timeout, retrying... ({attempt + 1}/{max_retries})")
                time.sleep(5)
                continue
            else:
                print(f"[OCR WARNING] PaddleOCR-VL failed: {e}")
                break
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                temp_path = None

    return "", 0.25
