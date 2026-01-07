import pandas as pd
import json

# Load the drug CSV
df = pd.read_csv(r"C:\Users\palya\Desktop\pharmalens\Pharmalens\models\training_data\Untitled spreadsheet - drugs.csv")  # Replace with actual path

# List to store all Q&A pairs
jsonl_data = []

for _, row in df.iterrows():
    drug = str(row['drug_name']).strip()
    generic = str(row['generic_name']).strip()
    desc = str(row['description']).strip()
    form = str(row['dosage_form']).strip()
    strength = str(row['strength']).strip()
    category = str(row['category']).strip()

    qa_pairs = [
        {
            "q": f"What is {drug} used for?",
            "a": f"{drug} ({generic}) is used for {desc.lower()}."
        },
        {
            "q": f"What is the generic name of {drug}?",
            "a": f"The generic name of {drug} is {generic}."
        },
        {
            "q": f"What is the dosage form of {drug}?",
            "a": f"{drug} is available as a {form.lower()}."
        },
        {
            "q": f"What is the strength of {drug}?",
            "a": f"The strength of {drug} is {strength}."
        },
        {
            "q": f"What category does {drug} belong to?",
            "a": f"{drug} belongs to the {category} category."
        },
        {
            "q": f"Can you give full details about {drug}?",
            "a": f"{drug} (Generic: {generic}) is a {category.lower()} used for {desc.lower()}. It is available in {form.lower()} form with a strength of {strength}."
        }
    ]

    for pair in qa_pairs:
        jsonl_data.append({
            "messages": [
                {"role": "user", "content": pair["q"]},
                {"role": "assistant", "content": pair["a"]}
            ]
        })

# Save to JSONL file
with open(r"C:/Users/palya/Desktop/pharmalens/Pharmalens/models/training_data/drug_qa_dataset.jsonl", "w", encoding="utf-8") as f:
    for item in jsonl_data:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

print(f"✅ Generated {len(jsonl_data)} Q&A entries and saved to 'drug_qa_dataset.jsonl'")
