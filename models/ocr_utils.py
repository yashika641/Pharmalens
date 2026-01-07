import boto3
import subprocess
import json
import csv
import re
import os

# ----------- TEXTRACT OCR FUNCTION -----------
def textract_ocr_text(image_path):
    textract = boto3.client('textract',region_name='us-east-1')  # Assumes AWS credentials are set up
    with open(image_path, 'rb') as document:
        img_bytes = document.read()

    response = textract.detect_document_text(Document={'Bytes': img_bytes})

    extracted_text = ""
    for item in response["Blocks"]:
        if item["BlockType"] == "LINE":
            extracted_text += item["Text"] + "\n"
    
    return extracted_text

# ----------- LLM CALL FUNCTION -----------
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

        # Try to extract JSON from LLM output
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

# ----------- EXPIRY VALIDATION -----------
import re

def validate_expiry(date_input):
    if isinstance(date_input, list):
        # Extract the first valid string from the list
        for item in date_input:
            if isinstance(item, str):
                match = re.match(r"(0[1-9]|1[0-2])[-/.](20[2-9][0-9])", item)
                if match:
                    return True
        return False  # No valid date string found
    elif isinstance(date_input, str):
        match = re.match(r"(0[1-9]|1[0-2])[-/.](20[2-9][0-9])", date_input)
        return bool(match)
    else:
        return False  # Unexpected type

from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# ----------- DRUG FUZZY MATCH FUNCTION -----------
def load_drug_list(csv_file_path):
    drug_list = []
    with open(csv_file_path, 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            drug_list.append(row[0].strip().upper())
    return list(set(drug_list))

def fuzzy_match_drug_name(input_name, drug_list):
    if not input_name or input_name == "Invalid or Unrecognized":
        return {"matched_name": "No Match", "confidence": 0}
    
    match, score = process.extractOne(input_name.upper(), drug_list, scorer=fuzz.token_sort_ratio)
    return {"matched_name": match, "confidence": score}

# ----------- APPLY FUZZY MATCH TO LLM OUTPUT -----------
drug_csv_path = r"C:\Users\palya\Desktop\pharmalens\models\drugs_database.csv"
drug_list = load_drug_list(drug_csv_path)

# If result is a list (multiple medicines) — handle accordingly
if isinstance(result, list):
    for item in result:
        match_result = fuzzy_match_drug_name(item.get("medicine_name", ""), drug_list)
        item["matched_medicine_name"] = match_result["matched_name"]
        item["match_confidence"] = match_result["confidence"]
else:
    match_result = fuzzy_match_drug_name(result.get("medicine_name", ""), drug_list)
    result["matched_medicine_name"] = match_result["matched_name"]
    result["match_confidence"] = match_result["confidence"]

# ----------- SAVE FUNCTIONS -----------
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

# ----------- MAIN EXECUTION FLOW -----------

# Set the image path
image_path = r"C:\Users\palya\Desktop\pharmalens\Pharmalens\models\dummy_inputs_prescription\prescription1.jpg"

# Step 1: Run OCR using Textract
ocr_text = textract_ocr_text(image_path)

# Step 2: Create prompt for LLM
prompt = f"""
You are a medical OCR data extractor.

Given the following OCR'd text, extract all medicine names, their dosage instructions, and expiry dates if available. 
Return data as a JSON list of medicines, where each item includes:
- Medicine Name
- Dosage
- Expiry Date (format: MM/YYYY or MM-YYYY)

eg: LOVOLIN 3 ML TOS X sd
MEFTAL-P (100/5) a 3 rol 505

OCR Text:
\"\"\"{ocr_text}\"\"\"

Respond only in JSON with keys: medicine_name, dosage, expiry_date.
If a field is not found, use "Invalid or Unrecognized".
"""

# Step 3: Query LLM
result = query_ollama(prompt)

# Step 4: Validate expiry format
if "expiry_date" in result and not validate_expiry(result["expiry_date"]):
    result["expiry_date"] = "Invalid or Unrecognized"

# Step 5: Save results
save_to_json(result)
save_to_csv(result)

# Step 6: Print results
print("✅ Extracted Info:")
print(json.dumps(result, indent=2))
print("🔎 OCR Text Before LLM:\n", ocr_text)
