# HELP INDIA – National Medical Disease History Portal

A full-stack, responsive healthcare portal prototype designed for digital medical history verification, diagnostic document archival, and AI-assisted clinical triage.

---

## 🌟 New Features

1. **Self-Registration (Doctors & Citizens)**:
   - **Doctor Registration**: Full name, medical council registration number, specialization, hospital affiliation, and password. Generates unique Doctor ID (e.g. `DOC1002`, `DOC1003`...).
   - **Citizen Registration**: Full demographics, blood group, emergency contact, chronic diseases, and password. Auto-generates Patient ID (e.g. `PAT1006`...).
   - Immediate login with newly created credentials.

2. **Prescription & Document File Upload Engine**:
   - Doctors can attach physical prescription scans/photos in **PDF, PNG, or JPEG** format (up to 10MB).
   - Dedicated file upload endpoint (`POST /api/upload`) using `multer`.
   - Files are stored in `help-india/backend/uploads/` and served statically.
   - Built-in interactive document viewer modal for images and PDFs.

3. **Multi-Category Clinical Records**:
   - **📋 Clinical Encounters & Prescriptions**: Date, disease, symptoms, diagnosis, doctor, medicines, notes, and attached prescription scan.
   - **🧪 Diagnostic Lab Reports**: Test name, pathology/radiology category, diagnostic lab, doctor prescribed, results summary, severity status badges (*Normal*, *Borderline High*, *Critical*), and attached report document.
   - **🩺 Doctor Consultation Summaries**: Formal outpatient notes, discharge summaries, clinical findings, recommendations, and attached specialist summary documents.

4. **Online AI Health Symptom Assistant**:
   - Connects to Google Gemini 1.5 Flash or OpenAI GPT-4o-mini via backend `.env`.
   - Includes automatic clinical history context attachment.
   - Built-in fallback to server-side rule engine if offline.

---

## 📁 Project Structure

```
help-india/
├── backend/                  # Node.js + Express REST API Server
│   ├── data/
│   │   ├── doctors.json      # Registered doctor credentials & profiles
│   │   └── patients.json     # Multi-category records (encounters, lab, doctor reports)
│   ├── uploads/              # Prescriptions, lab reports, & consultation scans (PDF/PNG/JPEG)
│   ├── .env.example          # Environment variables template
│   ├── .env                  # Local environment configuration
│   ├── package.json          # Dependencies (express, cors, dotenv, multer)
│   └── server.js             # Main REST API server & file upload handler
│
└── frontend/                 # Client Single-Page Application
    └── index.html            # Responsive UI with tabs, modals, viewer & AI assistant
```

---

## 🚀 Quick Start (Run Locally)

### 1. Start the Backend Server

```bash
cd help-india/backend
npm install
npm start
```

Server will run on: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

### 2. Open the Frontend

Open `help-india/frontend/index.html` in any web browser.  
Header will show: `🟢 Backend: Online`.

---

## 👥 Default Demo Credentials

| Role | ID | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Doctor (Default)** | `DOC1001` | `doctor123` | Search all patients, add encounters, upload prescriptions, attach lab reports & doctor summaries. |
| **New Doctors** | Self-registered | Chosen password | Full clinical authoring rights. |
| **Patient (Default)** | `PAT1001` to `PAT1005` | `patient123` | Read-only access to own disease history, lab reports, doctor summaries, and AI assistant. |
| **New Citizens** | Auto-assigned (`PAT1006`+) | Chosen password | Isolated read-only access to own profile and history. |

---

## ☁️ 1-Click Cloud Deployment (All-in-One on Render)

With **Option A (All-in-One)**, Express serves both the frontend web app and backend API from a single service with zero CORS setup:

1. **Push to GitHub**:
   * Commit and push your `help-india` directory to a GitHub repository (public or private).

2. **Deploy on Render (Free)**:
   * Sign up at [Render.com](https://render.com) (free).
   * Click **New +** → **Web Service**.
   * Connect your GitHub repository.
   * Configure settings:
     * **Root Directory**: `help-india/backend` (or leave empty if your repo root is `backend`)
     * **Runtime**: `Node`
     * **Build Command**: `npm install`
     * **Start Command**: `npm start`
   * Under **Environment Variables** (Optional for live Gemini AI):
     * `GEMINI_API_KEY`: *(Your Google AI Studio key)*
     * `AI_PROVIDER`: `gemini`
   * Click **Deploy Web Service**.

3. **Done!**:
   * Render gives you a single public link, for example:  
     `https://help-india-portal.onrender.com`
   * Visiting this URL loads the complete portal with live backend, prescription uploads, and AI assistant automatically connected!
