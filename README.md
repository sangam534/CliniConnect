# CLINI CONNECT – National Medical Disease History Portal

> **National Medical Disease History & Clinical Encounters Portal Prototype**  
> Built with **Python FastAPI**, clean modular architecture, and **NVIDIA NIM AI** integration.

---

## Key Features

1. **Modular, Minimalistic Architecture**:
   - High cohesion and low coupling with separated concerns (API, database, auth, records, uploads, AI).
   - Lightweight JSON-based persistence (`backend/data/`).
   - Single-service deployment: FastAPI serves both the API endpoints and the frontend UI.

2. **Accredited Doctor Portal**:
   - Search citizen records by Patient ID (`PAT1001`, `PAT1002`, etc.).
   - Record clinical encounters, diagnoses, place, and prescriptions.
   - Attach physical medical documents (PDF, PNG, JPEG) up to 10MB.
   - Record diagnostic laboratory reports (Pathology, Radiology, Biochemistry).
   - Log formal consultation summaries and discharge notes.

3. **Citizen / Patient Portal**:
   - Access verified lifetime clinical encounters and prescriptions.
   - View diagnostic lab findings and doctor consultation summaries.
   - Preview original prescription PDFs and lab report images.

4. **AI Disease & Condition Assistant (DeepSeek AI)**:
   - Powered by DeepSeek AI (`deepseek-ai/deepseek-v4-flash-0731`) via the NVIDIA NIM API.
   - **Summarize Condition**: Formulates a clear, empathetic clinical summary of the patient's reported symptoms, affected systems, and patterns.
   - **Get Medical Advice**: Provides evidence-based supportive guidance, questions to ask an attending physician, and red flag warnings for emergency conditions.
   - Option to include verified medical history context from the patient's portal record.

5. **Frictionless Experience**:
   - **Zero CAPTCHA**: CAPTCHA code generation and validation have been completely removed from both Doctor and Patient logins for a streamlined prototype experience.

---

## File Structure

```
med_india/
├── backend/
│   ├── data/
│   │   ├── doctors.json         # Demo doctor accounts
│   │   └── patients.json        # Demo citizen profiles & medical history
│   ├── uploads/                 # Uploaded prescription and report documents
│   ├── routes/
│   │   ├── auth.py              # Doctor & Patient login / registration (No CAPTCHA)
│   │   ├── patients.py          # Patient directory, profile & records CRUD
│   │   ├── upload.py            # Medical document upload handler
│   │   └── ai.py                # DeepSeek AI integration (Summarize & Advice)
│   ├── database.py              # Thread-safe JSON data access layer
│   ├── main.py                  # FastAPI app entrypoint, CORS & static file mounts
│   ├── requirements.txt         # Python dependencies
│   └── run.py                   # Server runner script
├── frontend/
│   ├── css/
│   │   └── style.css            # Clean, modern healthcare portal stylesheet
│   ├── js/
│   │   ├── api.js               # Clean fetch wrapper for REST endpoints
│   │   ├── auth.js              # Doctor & patient authentication (No CAPTCHA)
│   │   ├── doctor.js            # Doctor dashboard and records management
│   │   ├── patient.js           # Patient dashboard & AI Summarize/Advice handler
│   │   └── app.js               # Navigation, view switching, and modal controls
│   └── index.html               # Clean, semantic HTML layout (~480 lines)
└── README.md
```

---

## Quick Start Guide (Install & Run in One Go)

### Option A: One-Click Startup (Easiest)
* **Windows:** Double-click `start.bat` (automatically installs dependencies and starts the portal).
* **macOS / Linux:** Run `chmod +x start.sh && ./start.sh`.

### Option B: Terminal Command Line (Standard)
1. **Clone the repository:**
   ```bash
   git clone https://github.com/skyisblue629-max/Sih_prototype_1.git
   cd Sih_prototype_1
   ```

2. **Install all dependencies in one go:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python run.py
   ```

4. **Access the Portal:**
   Open your browser at: **`http://localhost:5000`**

---

## Demo Accounts

### Doctor Portal
- **Doctor ID**: `DOC1001`
- **Password**: `doctor123`

### Citizen / Patient Portal
- **Patient ID**: `PAT1001` (or `PAT1002`, `PAT1003`)
- **Password**: `patient123`
