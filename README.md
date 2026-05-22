<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=4fd1c5&height=200&section=header&text=PharmaLens&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=AI-Powered%20Medicine%20Scanner%20for%20India&descAlignY=60&descSize=20" width="100%"/>

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](LICENSE)

<br/>

### Scan medicines · Check drug interactions · Ask your AI Pharmacist · 25 Indian Languages

<br/>

| 🌐 Live Web App | 📱 Android APK |
|:---:|:---:|
| **[pharmalenss.netlify.app](https://pharmalenss.netlify.app)** | **[Download APK](https://drive.google.com/drive/folders/1DLfKs58-jVC3_7flgGP8rI0_q9Rle1ME?usp=sharing)** ← *(add your link here)* |

</div>

---

## What is PharmaLens?

PharmaLens is a full-stack health-tech application built for India's pharmaceutical ecosystem. Point your phone at any medicine strip, box, or prescription — get instant structured data including medicine name, dosage, expiry date, composition, and interaction warnings. Ask follow-up questions to an AI pharmacist powered by Google Gemini, in any of 25 Indian languages.

---

## Features

| | Feature | Description |
|---|---|---|
| 📷 | **Medicine Scanner** | 3-layer OCR pipeline — PaddleOCR → OCR.Space → Gemini Vision fallback |
| 📋 | **Prescription Scanner** | Extracts doctor name, diagnosis, prescribed medicines, dosage routes |
| 💊 | **Drug Interaction Checker** | Checks drug pairs against curated dataset + Gemini AI explanation |
| 🤖 | **AI Pharmacist Chat** | Streaming Gemini-powered chatbot specialised in Indian medicines |
| 🌐 | **25 Indian Languages** | Full UI translation via Google Translate API |
| 👤 | **Health Profile** | Stores your allergies, conditions, and medications |
| 📜 | **Scan History** | Complete history of all medicine and prescription scans |
| 🔔 | **Daily Reminders** | Local push notifications via Capacitor (Android) |
| 🆘 | **Emergency Card** | Offline-first card with your critical health data |
| 🔐 | **Auth** | Email/Password + Google OAuth + GitHub OAuth via Supabase |

---

## Tech Stack

<details>
<summary><b>🐍 Backend</b></summary>
<br/>

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Auth | Supabase Auth (JWT Bearer tokens) |
| Database | Supabase (PostgreSQL + RLS) |
| Storage | Supabase Storage |
| OCR Layer 1 | PaddleOCR-VL via Gradio public API |
| OCR Layer 2 | OCR.Space REST API |
| OCR Layer 3 | Google Gemini Vision (LLM fallback) |
| AI Chat | Google Gemini Flash (Server-Sent Events streaming) |
| Drug Data | DuckDB querying Parquet files |
| Translation | Google Cloud Translate API v2 |

</details>

<details>
<summary><b>⚛️ Frontend</b></summary>
<br/>

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite (SWC) |
| Mobile | Capacitor 8 (Android / iOS) |
| Styling | Tailwind CSS + custom glass-morphism theme |
| UI Components | Radix UI + shadcn/ui |
| Animations | Framer Motion |
| Auth Client | Supabase JS |
| Notifications | @capacitor/local-notifications |

</details>

---

## Project Structure

```
Pharmalens/
│
├── backend/                              # FastAPI Python backend
│   ├── main.py                           # App entry — CORS, middleware, routers
│   ├── requirements.txt                  # Python dependencies
│   ├── .env.example                      # Environment variable template
│   ├── start.sh                          # VPS startup script
│   │
│   ├── routes/                           # API route handlers
│   │   ├── login_routes.py               # POST /auth/login, /auth/logout
│   │   ├── scan_routes.py                # POST /images/upload → OCR pipeline
│   │   ├── user_profile_routes.py        # POST /user-profile (create/upsert)
│   │   ├── profile_settings.py           # GET/PATCH /user-profile/details + allergies/conditions
│   │   ├── drug_routes.py                # POST /drug-interactions/check
│   │   ├── chatbot_routes.py             # GET /chat/stream (SSE), GET /chat/history
│   │   ├── user_history_routes.py        # GET /user/history + detail endpoints
│   │   └── translate_router.py           # POST /translate
│   │
│   ├── models/
│   │   ├── ocr/                          # 3-layer OCR pipeline
│   │   │   ├── main.py                   # Pipeline orchestrator
│   │   │   ├── paddle_ocr.py             # Layer 1: PaddleOCR via Gradio
│   │   │   ├── easy_ocr.py               # Layer 2: OCR.Space REST API
│   │   │   ├── parsers.py                # Gemini Vision fallback + data parsers
│   │   │   └── supabase_databse_update.py # Persists OCR results to DB
│   │   │
│   │   └── drug_interaction_checker/
│   │       ├── drug_iteraction.py        # FAISS vector + DuckDB lookup
│   │       ├── gemini_checking.py        # Gemini AI explanation layer
│   │       └── parquet/                  # Drug interaction dataset (severity partitioned)
│   │           ├── drug_interactions/severity=mild/
│   │           ├── drug_interactions/severity=moderate/
│   │           └── drug_interactions/severity=severe/
│   │
│   └── utils/
│       ├── supabase.py                   # Singleton Supabase admin client
│       └── llm.py                        # Singleton Gemini LLM client
│
├── frontend/                             # React + Capacitor frontend
│   ├── src/
│   │   ├── App.tsx                       # Root — routes, auth state, navigation
│   │   ├── supabase.ts                   # Supabase JS client (persistSession: true)
│   │   │
│   │   └── components/
│   │       ├── HomePage.tsx              # Landing — feature grid, profile modal
│   │       ├── ScannerPage.tsx           # Camera + gallery image upload
│   │       ├── MedicineDetails.tsx       # Medicine scan result display
│   │       ├── PrescriptionDetails.tsx   # Prescription scan result display
│   │       ├── DrugInteractionChecker.tsx # Drug pair input + interaction results
│   │       ├── AIChat.tsx                # Streaming chatbot UI
│   │       ├── MedicationHistory.tsx     # Scan history list + detail view
│   │       ├── ProfileSettings.tsx       # Health profile + language + notifications
│   │       ├── EmergencyCard.tsx         # Offline emergency card
│   │       ├── Onboarding.tsx            # First-launch walkthrough screens
│   │       ├── login.tsx                 # Auth modal (email + OAuth)
│   │       ├── authcallback.tsx          # OAuth redirect handler
│   │       ├── protected.tsx             # Route guard component
│   │       ├── Navigation.tsx            # Bottom tab navigation bar
│   │       └── language_context.tsx      # Global translation hook
│   │
│   ├── capacitor.config.json             # Capacitor app config (appId, webDir)
│   ├── .env.example                      # Frontend env template
│   └── package.json
│
├── schema.sql                            # ← Run this in Supabase SQL Editor
├── .github/workflows/deploy.yml          # CI/CD pipeline
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Download |
|---|---|---|
| Python | 3.11 or higher | [python.org](https://python.org) |
| Node.js | 18 or higher | [nodejs.org](https://nodejs.org) |
| Git | any | [git-scm.com](https://git-scm.com) |
| Android Studio | latest | Only needed for Android builds |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/yashika641/Pharmalens.git
cd Pharmalens
```

---

### Step 2 — Set Up the Database (Supabase)

#### 2a · Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → click **New Project**
2. Give it a name (e.g. `pharmalens`), set a strong DB password, pick your nearest region
3. Wait ~1 minute for the project to initialize

#### 2b · Run the schema

1. In your Supabase dashboard → **SQL Editor** → **New query**
2. Open [`schema.sql`](./schema.sql) from this repo, paste the entire contents, and click **Run**

This automatically creates:
- ✅ All 6 tables (`user_profile`, `images`, `medicine_ocr_data`, `prescription_ocr_data`, `user_history`, `chatbot_history`)
- ✅ Storage bucket (`pharmalens`)
- ✅ Row-Level Security (RLS) policies for every table
- ✅ Performance indexes

#### 2c · Copy your API keys

Go to **Supabase Dashboard → Project Settings → API**:

| Key | Where it's used |
|---|---|
| **Project URL** | `SUPABASE_URL` + `VITE_SUPABASE_URL` |
| **anon / public** | `VITE_SUPABASE_ANON_KEY` (frontend only) |
| **service_role** | `SUPABASE_SERVICE_KEY` (backend only — **keep secret**) |
| **JWT Secret** | `SUPABASE_JWT_SECRET` (under API → JWT Settings) |

> ⚠️ The `service_role` key has full database access. Never put it in frontend code or commit it to git.

---

### Step 3 — Configure Supabase Auth

#### 3a · Enable email/password login

**Authentication → Providers → Email** → toggle **Enable** ✅

For local testing, disable "Confirm email" so you can sign up instantly.

#### 3b · Enable Google OAuth *(optional)*

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Add this as an **Authorized redirect URI**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**
5. In Supabase → **Authentication → Providers → Google** → paste both values → Enable ✅

#### 3c · Enable GitHub OAuth *(optional)*

1. Go to [github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Set **Authorization callback URL** to:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. Copy **Client ID** and **Client Secret**
4. Supabase → **Authentication → Providers → GitHub** → paste → Enable ✅

#### 3d · Add redirect URLs (required for OAuth to work)

**Authentication → URL Configuration → Redirect URLs** — add all three:

```
http://localhost:3000/auth/callback
https://pharmalenss.netlify.app/auth/callback
pharmalens://auth/callback
```

#### 3e · Set Site URL

**Authentication → URL Configuration → Site URL**:
```
https://pharmalenss.netlify.app
```
(use `http://localhost:3000` for local-only development)

---

### Step 4 — Get External API Keys

| Service | How to get it | Cost |
|---|---|---|
| **Gemini API** | [aistudio.google.com](https://aistudio.google.com/app/apikey) → Create API key | Free tier available |
| **Google Translate** | [Google Cloud Console](https://console.cloud.google.com) → Enable "Cloud Translation API" → Credentials → Create API key | Free tier available |
| **OCR.Space** | [ocr.space/ocrapi](https://ocr.space/ocrapi) → Register → get key | Free tier available |

> **Tip:** Gemini and Google Translate can use the **same Google Cloud API key** if both APIs are enabled on the same project.

---

### Step 5 — Configure Backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in every value:

```env
# ── Supabase ───────────────────────────────────────
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret

# ── Google Gemini ───────────────────────────────────
GEMINI_API_KEY=AIza...

# ── Google Translate ────────────────────────────────
GOOGLE_TRANSLATE_API_KEY=AIza...

# ── OCR.Space ───────────────────────────────────────
OCR_SPACE_API_KEY=K8...

# ── FAISS paths (drug interaction checker) ──────────
# Windows:
FAISS_INDEX_PATH=C:\full\path\to\Pharmalens\backend\models\chatbot\faiss_compressed.index
CHUNKS_PARQUET_PATH=C:\full\path\to\Pharmalens\backend\chunks.parquet
# Mac/Linux:
# FAISS_INDEX_PATH=./backend/models/chatbot/faiss_compressed.index
# CHUNKS_PARQUET_PATH=./backend/chunks.parquet

# ── Server ──────────────────────────────────────────
API_URL=http://localhost:8000
```

Now install and start the backend:

```bash
# From the repo root (not inside /backend)
cd ..

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start backend
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Backend live at **http://localhost:8000**  
✅ API docs at **http://localhost:8000/docs**

---

### Step 6 — Configure Frontend

Open a **new terminal**:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Local backend:
VITE_API_URL=http://localhost:8000

# Production VPS backend:
# VITE_API_URL=http://your-vps-ip:8000
```

Install and run:

```bash
npm install
npm run dev
```

✅ Frontend live at **http://localhost:3000**

---

### Quick-Start Checklist

```
□ Supabase project created
□ schema.sql executed successfully in SQL Editor
□ Email auth enabled in Supabase
□ Redirect URLs added to Supabase (all 3 listed above)
□ Google / GitHub OAuth configured (optional)
□ backend/.env filled with all API keys
□ frontend/.env filled
□ Backend running on :8000
□ Frontend running on :3000
□ Open http://localhost:3000 → Sign Up → scan a medicine image
```

---

## OCR Pipeline

The medicine scanner uses a 3-layer pipeline with automatic confidence-based fallback:

```
     Image Uploaded
           │
           ▼
  ┌─────────────────────┐
  │  Layer 1            │
  │  PaddleOCR-VL       │──── confidence ≥ 0.85 ──→ ✅ Use result
  │  (Gradio, 3 retries)│
  └────────┬────────────┘
           │ confidence < 0.85
           ▼
  ┌─────────────────────┐
  │  Layer 2            │
  │  OCR.Space API      │──── confidence ≥ 0.75 ──→ ✅ Use result
  │  (image compressed) │
  └────────┬────────────┘
           │ confidence < 0.75
           ▼
  ┌─────────────────────┐
  │  Layer 3            │
  │  Gemini Vision      │──── always returns ──────→ ✅ Use result
  │  (LLM extraction)   │
  └────────┬────────────┘
           │
           ▼
   Parse → Save to Supabase → Return structured data to frontend
```

---

## Database Schema

```
auth.users  (Supabase built-in Auth)
    │
    ├─── user_profile          health data (age, phone, allergies, conditions, medications)
    │
    ├─── images                uploaded image metadata + Supabase Storage URL
    │       │
    │       ├─── medicine_ocr_data       parsed medicine info per scan
    │       └─── prescription_ocr_data   parsed prescription info per scan
    │
    ├─── user_history          compact JSON index of all scan IDs per user
    │
    └─── chatbot_history       AI pharmacist conversation log
```

Full SQL with RLS policies → **[`schema.sql`](./schema.sql)**

---

## API Reference

All protected endpoints require the header:
```
Authorization: Bearer <supabase_access_token>
```

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/` | — | Health check |
| `POST` | `/auth/login` | — | Email/password login |
| `POST` | `/auth/logout` | — | Clear session cookie |
| `POST` | `/images/upload` | ✅ | Upload image → run full OCR pipeline |
| `POST` | `/user-profile` | ✅ | Create / upsert health profile |
| `GET` | `/user-profile/details` | ✅ | Fetch full profile row |
| `PATCH` | `/user-profile/update` | ✅ | Update name, age, phone, username |
| `POST` | `/user-profile/add-allergy` | ✅ | Add allergy to profile |
| `DELETE` | `/user-profile/remove-allergy` | ✅ | Remove allergy |
| `POST` | `/user-profile/add-condition` | ✅ | Add health condition |
| `DELETE` | `/user-profile/remove-condition` | ✅ | Remove condition |
| `POST` | `/drug-interactions/check` | ✅ | Check interaction between 2+ drugs |
| `GET` | `/chat/stream` | ✅ | Stream AI pharmacist response (SSE) |
| `GET` | `/chat/history` | ✅ | Last 10 chat messages |
| `GET` | `/user/history` | ✅ | All scan summaries |
| `GET` | `/user/history/medicine/{id}` | ✅ | Full medicine scan detail |
| `GET` | `/user/history/prescription/{id}` | ✅ | Full prescription scan detail |
| `POST` | `/translate` | — | Translate text to any Indian language |

---

## Building the Android App

```bash
cd frontend

# 1. Production build
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```

In Android Studio:
- Press ▶ **Run** to test on a device or emulator
- **Build → Generate Signed APK / Bundle** for a release build

> The app uses custom deep link scheme `pharmalens://` — configured in `capacitor.config.json` and the Android manifest automatically by Capacitor.

---

## Deployment

### Backend on a Linux VPS

```bash
# After uploading the repo to your server:
bash backend/start.sh
```

The script activates the venv, installs requirements, and starts Uvicorn with 2 workers on port 8000.

### Frontend on Netlify

1. Push to GitHub — Netlify auto-deploys on every push to `main`
2. Go to **Netlify → Site Settings → Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` ← your VPS backend URL

---

## Environment Variables Reference

### `backend/.env`

| Variable | Required | Description |
|---|:---:|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key (admin — backend only) |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret for token verification |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GOOGLE_TRANSLATE_API_KEY` | ✅ | Google Cloud Translate API key |
| `OCR_SPACE_API_KEY` | ✅ | OCR.Space API key |
| `FAISS_INDEX_PATH` | ⚠️ | Absolute path to FAISS index file |
| `CHUNKS_PARQUET_PATH` | ⚠️ | Absolute path to chunks parquet file |
| `API_URL` | ✅ | Backend base URL |

### `frontend/.env`

| Variable | Required | Description |
|---|:---:|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_API_URL` | ✅ | Backend API base URL |

---

## Supported Languages

PharmaLens supports full UI translation for all 22 scheduled languages of India plus more:

`English` · `Hindi` · `Bengali` · `Telugu` · `Marathi` · `Tamil` · `Gujarati` · `Urdu` · `Kannada` · `Odia` · `Malayalam` · `Punjabi` · `Assamese` · `Maithili` · `Sanskrit` · `Santali` · `Kashmiri` · `Nepali` · `Sindhi` · `Dogri` · `Manipuri` · `Bodo` · `Konkani` · `Bhojpuri` · `Mizo`

---

## Team

| Name | Role | Links |
|---|---|---|
| **Yashika Pal** | Lead Developer & AI Engineer | [GitHub](https://github.com/yashika641) · [LinkedIn](https://www.linkedin.com/in/-yashika-pal-) |
| **Prince Kaushal** | Fullstack Developer | [GitHub](https://github.com/prince-kaushal01) · [LinkedIn](https://www.linkedin.com/in/prince-kaushal-473630350) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "add: your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License © 2025 PharmaLens

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=4fd1c5&height=100&section=footer" width="100%"/>

**Built with ❤️ for India's healthcare accessibility**

*Know your medicine before you take it.*

</div>
