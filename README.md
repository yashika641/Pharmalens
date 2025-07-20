 
# 🧬 PharmaLens – Smart Medicine Recognition & Misuse Prevention

> A privacy-first, offline-capable AI assistant that identifies medicines from pill strips, verifies usage instructions, and warns against drug interactions — powered by vision + LLMs.

---

## 🩺 Why PharmaLens?

In many rural and elderly populations, medicine misuse occurs due to:

- Similar-looking pills or packaging
- Inability to read labels (due to literacy or language barriers)
- Lack of access to verified pharmaceutical info

**PharmaLens** aims to solve this using AI + computer vision + NLP.

---

## 🔍 Features

✅ Pill & Strip Scanner (Image Input)  
✅ OCR (Read Printed Labels)  
✅ Drug Verification (Name, Manufacturer, Type)  
✅ Correct Dosage Display  
✅ Drug Interaction Checker (for multiple meds)  
✅ Voice/Text Prompt with LLM (Gemma 3n via Ollama)  
✅ Offline Use Capability  
✅ Batch Scanning of Multiple Pills  
✅ Confidence Scoring + Retry if Needed  
✅ "Ask a Pharmacist" AI Mode (LLM fallback)  
✅ Built-in Safety Warnings & Alert System

---

## 🧠 Tech Stack

| Module                | Tool/Tech                          |
|----------------------|------------------------------------|
| OCR                  | Tesseract + OpenCV                 |
| LLM                  | Gemma 3n (Ollama Local Deployment) |
| Backend              | FastAPI / Streamlit                |
| UI                   | Streamlit                          |
| Dataset              | Local JSON/CSV Drug DB (Custom)    |
| Image Processing     | OpenCV, PIL                        |

---

## 🚀 Project Structure

```

pharmalens/
├── main.py                  # Entry point (Streamlit/FastAPI)
├── ocr/
│   └── ocr\_utils.py         # OCR + preprocessing
├── llm/
│   └── gemma\_prompts.py     # LLM interaction logic
├── data/
│   └── drugs\_db.csv         # Drug data
├── static/
│   └── sample\_pill.jpg      # Sample images
├── app/
│   └── components/          # UI elements
├── requirements.txt
└── README.md

````

---

## ⚙️ Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/pharmalens.git
cd pharmalens

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
streamlit run main.py
````

---

## 📸 Sample Usage

1. Upload pill strip image
2. OCR extracts label
3. AI confirms medicine
4. Shows dosage, interaction warnings
5. Optional LLM query: *“Can I take this with aspirin?”*

---

## 💬 Example Prompt (to Gemma)

```text
"This pill says 'Paracetamol 500mg'. Can I take this with Ibuprofen? Are there any interaction risks for a 65-year-old diabetic patient?"
```

---

## 🔒 Privacy-First Design

* No cloud storage of images
* LLM runs locally via [Ollama](https://ollama.com/)
* Drug data stored offline

---

## 🤖 Future Additions

* Voice input (speech-to-text)
* Multilingual support
* Real pharmacist API integration (optional)
* Integration with government health DBs (India, WHO, etc.)

---

## 📬 Contribute

Got a better OCR model or Indian medicine dataset? PRs welcome!

---
## 👥 Team

Meet the creators behind **PharmaLens**:

|     Name        |          Role                 |                                     GitHub / LinkedIn                                                      |
|-----------------|-------------------------------|------------------------------------------------------------------------------------------------------------|
| Yashika Pal     | Lead Developer & AI Engineer  | [GitHub](https://github.com/yashika641) / [LinkedIn](www.linkedin.com/in/-yashika-pal-)                    |
| Prince Kaushal  | Fullstack Developer           | [GitHub](https://github.com/prince-kaushal01) / [LinkedIn](www.linkedin.com/in/prince-kaushal-473630350)   |

> 🤝 Open to collaborations — reach out if you’d like to contribute!


---

## 📄 License

MIT License © 2025 
