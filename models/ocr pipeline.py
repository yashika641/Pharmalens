import cloudinary
import cloudinary.uploader
import requests
import boto3
import subprocess
import json
import csv
import os
import re
from fuzzywuzzy import process

# ---------- Cloudinary Config ----------
cloudinary.config(
    cloud_name='dldujqlxu',
    api_key='834694512823163',
    api_secret='b_5LwPNM4RtL_CgInqPRycrlCZQ'
)

# ---------- Step 1: Upload and Download Image ----------
def upload_and_get_local_image(image_path, temp_download_path="temp_image.jpg"):
    upload_response = cloudinary.uploader.upload(image_path)
    image_url = upload_response['secure_url']

    # Download the uploaded image locally
    img_data = requests.get(image_url).content
    with open(temp_download_path, 'wb') as handler:
        handler.write(img_data)
    
    return temp_download_path

# ---------- Step 2: Textract OCR ----------
def textract_ocr_text(image_path):
    textract = boto3.client('textract', region_name='us-east-1')
    with open(image_path, 'rb') as document:
        img_bytes = document.read()

    response = textract.detect_document_text(Document={'Bytes': img_bytes})

    extracted_text = ""
    for item in response["Blocks"]:
        if item["BlockType"] == "LINE":
            extracted_text += item["Text"] + "\n"
    
    return extracted_text

# ---------- Step 3: Query LLM ----------
def query_ollama(prompt, model="llama3"):
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt.encode('utf-8'),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=180
        )
        output = result.stdout.decode('utf-8').strip()

        json_match = re.search(r"\{.*?\}", output, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            return {
                "error": "Failed to extract JSON",
                "raw_llm_response": output
            }
    except Exception as e:
        return {"error": str(e)}

# ---------- Step 4: Expiry Date Validation ----------
def validate_expiry(date_input):
    if isinstance(date_input, list):
        for item in date_input:
            if isinstance(item, str):
                match = re.match(r"(0[1-9]|1[0-2])[-/.](20[2-9][0-9])", item)
                if match:
                    return True
        return False
    elif isinstance(date_input, str):
        match = re.match(r"(0[1-9]|1[0-2])[-/.](20[2-9][0-9])", date_input)
        return bool(match)
    else:
        return False

# ---------- Step 5: Fuzzy Match to CSV ----------
def fuzzy_match_medicine_name(extracted_name, csv_path=r'C:\Users\palya\Desktop\pharmalens\Pharmalens\Untitled spreadsheet - drugs.csv'):
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        drug_list = [row[0] for row in reader if row]

    best_match, score = process.extractOne(extracted_name, drug_list)
    return best_match if score > 80 else extracted_name  # Optional threshold

# ---------- Save Functions ----------
def save_to_json(data, filename="output.json"):
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

def save_to_csv(data, filename="output.csv"):
    valid_fields = ["medicine_name", "dosage", "expiry_date"]

    filtered_data = {k: data.get(k, "") for k in valid_fields}

    file_exists = os.path.isfile(filename)
    with open(filename, mode='a', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=valid_fields)
        if not file_exists:
            writer.writeheader()
        writer.writerow(filtered_data)

# ---------- MAIN FLOW ----------
def run_pipeline(upload_img_path):
    # Upload to Cloudinary + Download locally
    print("starting pipeline...")
    local_img_path = upload_and_get_local_image(upload_img_path)
    print("Image uploaded and downloaded locally")
    # OCR
    print("Starting OCR...")
    ocr_text = textract_ocr_text(local_img_path)
    print("ocr done")
    # Prompt for LLM
    prompt = f"""
You are a medical OCR data extractor.

Given the following OCR'd text, extract all medicine names, their dosage instructions, and expiry dates if available. 
Return data as a JSON list of medicines, where each item includes:
- Medicine Name
- Dosage
- Expiry Date (format: MM/YYYY or MM-YYYY)

OCR Text:
\"\"\"{ocr_text}\"\"\"

Respond only in JSON with keys: medicine_name, dosage, expiry_date.
If a field is not found, use "Invalid or Unrecognized".
"""

    result = query_ollama(prompt)

    # Expiry Format Check
    if "expiry_date" in result and not validate_expiry(result["expiry_date"]):
        result["expiry_date"] = "Invalid or Unrecognized"

    # Fuzzy match name to CSV
    if "medicine_name" in result:
        result["medicine_name"] = fuzzy_match_medicine_name(result["medicine_name"])

    # Save
    save_to_json(result)
    save_to_csv(result)

    print("✅ Extracted Info:")
    print(json.dumps(result, indent=2))
    print("🔎 OCR Text Before LLM:\n", ocr_text)

# ----------- RUN THE PIPELINE -----------
if __name__ == "__main__":
    run_pipeline(r"C:\Users\palya\Desktop\pharmalens\Pharmalens\models\inputs_medicine\ibuprofen.jpg")  # <--- change this to the image file you're uploading
