import os
import io
import tempfile
from PIL import Image
from gradio_client import Client, handle_file

from models.ocr.exceptions import OCREngineError

# =========================
# INIT CLIENT (ONCE)
# =========================
# _paddle_client = Client("PaddlePaddle/PaddleOCR-VL_Online_Demo")
# paddle_ocr.py
from gradio_client import Client

_paddle_client = None

def get_paddle_client():
    global _paddle_client
    if _paddle_client is None:
        _paddle_client = Client(
            "PaddlePaddle/PaddleOCR-VL_Online_Demo",
            # timeout=60
        )
    return _paddle_client


def _save_temp_image(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    image.save(tmp.name)
    tmp.close()
    return tmp.name


def run_paddle_ocr(image_bytes: bytes) -> tuple[str, float]:
    """
    PaddleOCR-VL via HF API
    SAFE: never crashes backend
    """
    temp_path = None

    try:
        temp_path = _save_temp_image(image_bytes)

        # ✅ parse_doc_router returns 3 values
        markdown_output, _, _ = _paddle_client.predict( # type: ignore
            fp=handle_file(temp_path),
            use_chart=False,
            use_unwarping=False,
            use_orientation=True,
            api_name="/parse_doc_router"
        )

        if not markdown_output:
            return "", 0.0

        lines = [
            line.strip()
            for line in markdown_output.splitlines()
            if line.strip()
        ]

        text = "\n".join(lines)

        # Heuristic confidence
        confidence = min(0.95, 0.6 + 0.01 * len(lines))

        return text, round(confidence, 3)

    except Exception as exc:
        print(f"[OCR WARNING] PaddleOCR-VL failed: {exc}")
        return "", 0.25

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
