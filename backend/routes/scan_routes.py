from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import base64
import os
from datetime import datetime
from PIL import Image
from io import BytesIO

router = APIRouter()

TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)


class ImagePayload(BaseModel):
    image: str  # base64 image


@router.post("/scan-image")
def scan_image(payload: ImagePayload):
    try:
        image_data = payload.image

        # Remove base64 header if present
        if "," in image_data:
            image_data = image_data.split(",")[1]

        # Decode image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))

        # Generate unique filename
        filename = f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(TEMP_DIR, filename)

        # Save image
        image.save(filepath)

        print(f"✅ Image saved: {filepath}")

        return {
            "status": "success",
            "filename": filename
        }

    except Exception as e:
        print("❌ Error saving image:", e)
        raise HTTPException(status_code=400, detail="Invalid image data")
