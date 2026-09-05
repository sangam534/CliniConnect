/**
 * ==============================================================================
 * HELP INDIA – National Medical Disease History Portal
 * Backend REST API Server (Node.js + Express)
 * ==============================================================================
 * Features:
 * - Doctor & Patient Self-Registration with Authentication
 * - Role-Based Access Control (Strict Patient Isolation)
 * - Multi-category Medical Record Management:
 *     1. Disease Trajectories & Prescriptions
 *     2. Diagnostic Lab Reports (Pathology, Radiology, Biochemistry)
 *     3. Formal Doctor Reports & Consultation Summaries
 * - Medical Document File Upload Engine (PDF, PNG, JPEG) via Multer
 * - Online AI Engine Integration (Google Gemini, OpenAI, Custom AI, Fallback)
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const DATA_DIR = path.join(__dirname, 'data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const DOCTORS_FILE = path.join(DATA_DIR, 'doctors.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const FRONTEND_DIR = path.join(__dirname, '../frontend');

// Ensure data and uploads directories exist
if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR, { recursive: true });
if (!fsSync.existsSync(UPLOADS_DIR)) fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });

// In-memory backup of default mock patients for the reset mechanism
let INITIAL_DEFAULT_PATIENTS = null;

// ==============================================================================
// MULTER FILE UPLOAD CONFIGURATION (PDF, PNG, JPEG)
// ==============================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${uniqueSuffix}-${safeName}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PDF, PNG, and JPEG documents are permitted."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// ==============================================================================
// MIDDLEWARE
// ==============================================================================
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requester-role', 'x-requester-id']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded prescriptions, lab reports, and doctor reports
app.use('/uploads', express.static(UPLOADS_DIR));

// Static file serving for frontend UI (All-in-One Single Service Deployment)
if (fsSync.existsSync(FRONTEND_DIR)) {
    app.use(express.static(FRONTEND_DIR));
}

// Request Logger
app.use((req, res, next) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// ==============================================================================
// DATABASE FILE HELPERS
// ==============================================================================
async function loadPatients() {
    try {
        const raw = await fs.readFile(PATIENTS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!INITIAL_DEFAULT_PATIENTS && Array.isArray(parsed) && parsed.length > 0) {
            INITIAL_DEFAULT_PATIENTS = JSON.parse(JSON.stringify(parsed));
        }
        return parsed;
    } catch (err) {
        console.error("Error reading patients.json:", err.message);
        return INITIAL_DEFAULT_PATIENTS ? JSON.parse(JSON.stringify(INITIAL_DEFAULT_PATIENTS)) : [];
    }
}

async function savePatients(data) {
    await fs.writeFile(PATIENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function loadDoctors() {
    try {
        const raw = await fs.readFile(DOCTORS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error reading doctors.json:", err.message);
        return [
            {
                id: "DOC1001",
                name: "Dr. Raj Sharma",
                password: "doctor123",
                specialization: "General Physician",
                hospital: "All India Institute of Medical Sciences (AIIMS)",
                registrationNumber: "MCI-2015-84920",
                registeredOn: "2026-01-10"
            }
        ];
    }
}

async function saveDoctors(data) {
    await fs.writeFile(DOCTORS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ==============================================================================
// 1. SYSTEM HEALTH & INFO ENDPOINT
// ==============================================================================
app.get('/api/health', async (req, res) => {
    const patients = await loadPatients();
    const doctors = await loadDoctors();

    res.json({
        status: "ONLINE",
        service: "HELP INDIA – National Medical Disease History Portal API",
        version: "2.0.0",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        registeredPatientsCount: (patients || []).length,
        registeredDoctorsCount: (doctors || []).length,
        patientsCount: (patients || []).length,
        doctorsCount: (doctors || []).length,
        aiConfig: {
            configuredProvider: process.env.AI_PROVIDER || 'gemini',
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
            openaiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()),
            customAiConfigured: Boolean(process.env.CUSTOM_AI_ENDPOINT && process.env.CUSTOM_AI_ENDPOINT.trim())
        },
        disclaimer: "DEMO PROJECT — MOCK DATA — NOT A REAL GOVERNMENT SERVICE"
    });
});

// ==============================================================================
// 2. DOCUMENT FILE UPLOAD ENDPOINT (PDF, PNG, JPEG)
// ==============================================================================
app.post('/api/upload', (req, res) => {
    upload.fields([{ name: 'document', maxCount: 1 }, { name: 'file', maxCount: 1 }])(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        const uploadedFile = (req.files && req.files.document && req.files.document[0]) ||
                             (req.files && req.files.file && req.files.file[0]);

        if (!uploadedFile) {
            return res.status(400).json({ success: false, message: "No document file uploaded." });
        }

        const fileUrl = `/uploads/${uploadedFile.filename}`;
        res.json({
            success: true,
            message: "File uploaded successfully.",
            fileUrl,
            fileName: uploadedFile.originalname,
            storedName: uploadedFile.filename,
            mimeType: uploadedFile.mimetype,
            sizeBytes: uploadedFile.size,
            file: {
                url: fileUrl,
                filename: uploadedFile.filename,
                originalName: uploadedFile.originalname,
                mimeType: uploadedFile.mimetype,
                size: uploadedFile.size
            }
        });
    });
});

// ==============================================================================
// 3. AUTHENTICATION & SELF-REGISTRATION ENDPOINTS
// ==============================================================================

// Doctor Login
app.post('/api/auth/doctor/login', async (req, res) => {
    const { doctorId, password } = req.body;

    if (!doctorId || !password) {
        return res.status(400).json({ success: false, message: "Doctor ID and password are required." });
    }

    const doctors = await loadDoctors();
    const doctor = doctors.find(d => d.id.toUpperCase() === doctorId.trim().toUpperCase());

    if (doctor && doctor.password === password) {
        const { password: _, ...cleanDoctor } = doctor;
        return res.json({
            success: true,
            role: "doctor",
            user: cleanDoctor,
            doctor: cleanDoctor
        });
    }

    return res.status(401).json({
        success: false,
        message: "Invalid Doctor ID or password. Use demo account DOC1001 / doctor123 or register a new doctor."
    });
});

// Doctor Self-Registration
app.post('/api/auth/doctor/register', async (req, res) => {
    const { name, hospital, registrationNumber, password, requestedId } = req.body;
    const specialization = req.body.specialization || req.body.specialty;

    if (!name || !specialization || !hospital || !password) {
        return res.status(400).json({
            success: false,
            message: "Doctor name, specialization, hospital affiliation, and password are required."
        });
    }

    const doctors = await loadDoctors();

    // Determine Doctor ID
    let doctorId = (requestedId || "").trim().toUpperCase();
    if (doctorId) {
        if (doctors.some(d => d.id.toUpperCase() === doctorId)) {
            return res.status(400).json({ success: false, message: `Doctor ID '${doctorId}' is already registered.` });
        }
    } else {
        // Auto-generate next DOC ID
        let maxNum = 1001;
        doctors.forEach(d => {
            const m = d.id.match(/^DOC(\d+)$/i);
            if (m) {
                const num = parseInt(m[1], 10);
                if (num >= maxNum) maxNum = num + 1;
            }
        });
        doctorId = `DOC${maxNum}`;
    }

    const newDoctor = {
        id: doctorId,
        name: name.trim().startsWith("Dr.") ? name.trim() : `Dr. ${name.trim()}`,
        password,
        specialization: specialization.trim(),
        hospital: hospital.trim(),
        registrationNumber: registrationNumber ? registrationNumber.trim() : `MCI-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        registeredOn: new Date().toISOString().split('T')[0]
    };

    doctors.push(newDoctor);
    await saveDoctors(doctors);

    const { password: _, ...cleanDoc } = newDoctor;
    res.status(201).json({
        success: true,
        message: "Doctor registration successful. You can now log in with your new credentials.",
        doctor: cleanDoc
    });
});

// Patient Login
app.post('/api/auth/patient/login', async (req, res) => {
    const { patientId, password } = req.body;

    if (!patientId || !password) {
        return res.status(400).json({ success: false, message: "Patient ID and password are required." });
    }

    const patients = await loadPatients();
    const patient = patients.find(p => p.patientId.toUpperCase() === patientId.trim().toUpperCase());

    if (patient && patient.password === password) {
        const { password: _, ...patientProfile } = patient;
        return res.json({
            success: true,
            role: "patient",
            user: patientProfile,
            patient: patientProfile
        });
    }

    return res.status(401).json({
        success: false,
        message: "Invalid Patient ID or password. Use demo accounts PAT1001-PAT1005 (patient123) or register a new citizen profile."
    });
});

// Patient Self-Registration
app.post('/api/auth/patient/register', async (req, res) => {
    const {
        name,
        gender,
        bloodGroup,
        weight,
        guardianMobile,
        address,
        majorDiseases,
        password,
        requestedId
    } = req.body;

    const mobile = req.body.mobile || req.body.phone;
    const age = req.body.age || (req.body.dob ? (new Date().getFullYear() - new Date(req.body.dob).getFullYear()) : null);

    if (!name || !age || !gender || !bloodGroup || !mobile || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, age, gender, blood group, mobile number, and password are required."
        });
    }

    const patients = await loadPatients();

    // Determine Patient ID
    let patientId = (requestedId || "").trim().toUpperCase();
    if (patientId) {
        if (patients.some(p => p.patientId.toUpperCase() === patientId)) {
            return res.status(400).json({ success: false, message: `Patient ID '${patientId}' is already registered.` });
        }
    } else {
        // Auto-generate next PAT ID
        let maxNum = 1005;
        patients.forEach(p => {
            const m = p.patientId.match(/^PAT(\d+)$/i);
            if (m) {
                const num = parseInt(m[1], 10);
                if (num >= maxNum) maxNum = num + 1;
            }
        });
        patientId = `PAT${maxNum}`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const newPatient = {
        id: patientId,
        patientId,
        password,
        name: name.trim(),
        age: parseInt(age, 10) || 30,
        gender: gender.trim(),
        bloodGroup: bloodGroup.trim(),
        weight: weight ? (weight.toLowerCase().includes('kg') ? weight.trim() : `${weight.trim()} kg`) : "65 kg",
        mobile: mobile.trim(),
        guardianMobile: guardianMobile ? guardianMobile.trim() : mobile.trim(),
        address: address ? address.trim() : "Address not provided",
        majorDiseases: majorDiseases ? majorDiseases.trim() : "None registered",
        lastUpdated: todayStr,
        diseases: [],
        labReports: [],
        doctorReports: []
    };

    patients.push(newPatient);
    await savePatients(patients);

    const { password: _, ...cleanPat } = newPatient;
    res.status(201).json({
        success: true,
        message: "Citizen registration successful. Please record your Patient ID.",
        patient: cleanPat
    });
});

// ==============================================================================
// 4. PATIENT PROFILE & DIRECTORY ENDPOINTS
// ==============================================================================

// GET all patients (Doctor Directory Overview)
app.get('/api/patients', async (req, res) => {
    const requesterRole = req.headers['x-requester-role'] || req.query.requesterRole;

    if (requesterRole !== 'doctor') {
        return res.status(403).json({
            success: false,
            message: "Access forbidden. Only accredited healthcare practitioners can inspect the patient directory."
        });
    }

    const patients = await loadPatients();
    const summary = patients.map(p => ({
        patientId: p.patientId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        majorDiseases: p.majorDiseases,
        lastUpdated: p.lastUpdated,
        totalDiseases: p.diseases ? p.diseases.length : 0,
        totalLabReports: p.labReports ? p.labReports.length : 0,
        totalDoctorReports: p.doctorReports ? p.doctorReports.length : 0
    }));

    res.json({ success: true, count: summary.length, data: summary });
});

// GET single patient by ID (With strict patient isolation)
app.get('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const requesterRole = req.headers['x-requester-role'] || req.query.requesterRole || 'doctor';
    const requesterId = (req.headers['x-requester-id'] || req.query.requesterId || '').trim().toUpperCase();

    // Enforce Citizen Data Privacy Isolation
    if (requesterRole === 'patient' && requesterId && requesterId !== patientId) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Patient ${requesterId} is strictly prohibited from accessing records of ${patientId}.`
        });
    }

    const patients = await loadPatients();
    const patient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!patient) {
        return res.status(404).json({ success: false, message: "Patient record not found." });
    }

    const { password: _, ...cleanProfile } = patient;
    if (!cleanProfile.diseases) cleanProfile.diseases = [];
    if (!cleanProfile.labReports) cleanProfile.labReports = [];
    if (!cleanProfile.doctorReports) cleanProfile.doctorReports = [];

    res.json({ success: true, data: cleanProfile });
});

// ==============================================================================
// 5. DISEASE ENCOUNTER & PRESCRIPTION CRUD (DOCTOR ONLY)
// ==============================================================================
app.post('/api/patients/:id/records', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const {
        date,
        diseaseName,
        symptoms,
        diagnosis,
        doctorName,
        place,
        hospitalName,
        hospitalAddress,
        medicines,
        notes,
        prescriptionDocumentUrl,
        prescriptionFileName
    } = req.body;

    if (!date || !diseaseName || !doctorName || !symptoms || !diagnosis || !place || !hospitalName || !medicines) {
        return res.status(400).json({ success: false, message: "All mandatory clinical fields must be provided." });
    }

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient) {
        return res.status(404).json({ success: false, message: "Target patient not found." });
    }

    const newRecord = {
        date,
        diseaseName,
        symptoms,
        diagnosis,
        doctorName,
        place,
        hospitalName,
        hospitalAddress: hospitalAddress || "",
        medicines,
        notes: notes || "",
        prescriptionDocumentUrl: prescriptionDocumentUrl || "",
        prescriptionFileName: prescriptionFileName || ""
    };

    if (!targetPatient.diseases) targetPatient.diseases = [];
    targetPatient.diseases.unshift(newRecord);
    targetPatient.lastUpdated = date;

    await savePatients(patients);

    res.status(201).json({
        success: true,
        message: "Clinical disease record and prescription added successfully.",
        totalRecords: targetPatient.diseases.length,
        lastUpdated: targetPatient.lastUpdated,
        record: newRecord
    });
});

app.put('/api/patients/:id/records/:index', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const index = parseInt(req.params.index, 10);

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient || !targetPatient.diseases || !targetPatient.diseases[index]) {
        return res.status(404).json({ success: false, message: "Medical record not found at index." });
    }

    const existing = targetPatient.diseases[index];
    targetPatient.diseases[index] = {
        date: req.body.date || existing.date,
        diseaseName: req.body.diseaseName || existing.diseaseName,
        symptoms: req.body.symptoms || existing.symptoms,
        diagnosis: req.body.diagnosis || existing.diagnosis,
        doctorName: req.body.doctorName || existing.doctorName,
        place: req.body.place || existing.place,
        hospitalName: req.body.hospitalName || existing.hospitalName,
        hospitalAddress: req.body.hospitalAddress || existing.hospitalAddress,
        medicines: req.body.medicines || existing.medicines,
        notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
        prescriptionDocumentUrl: req.body.prescriptionDocumentUrl !== undefined ? req.body.prescriptionDocumentUrl : existing.prescriptionDocumentUrl,
        prescriptionFileName: req.body.prescriptionFileName !== undefined ? req.body.prescriptionFileName : existing.prescriptionFileName
    };

    await savePatients(patients);
    res.json({ success: true, message: "Medical record updated.", record: targetPatient.diseases[index] });
});

app.delete('/api/patients/:id/records/:index', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const index = parseInt(req.params.index, 10);

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient || !targetPatient.diseases || !targetPatient.diseases[index]) {
        return res.status(404).json({ success: false, message: "Medical record not found." });
    }

    const removed = targetPatient.diseases.splice(index, 1);
    await savePatients(patients);

    res.json({ success: true, message: "Medical record deleted.", deletedRecord: removed[0] });
});

// ==============================================================================
// 6. DIAGNOSTIC LAB REPORTS CRUD (DOCTOR ONLY)
// ==============================================================================
app.post('/api/patients/:id/lab-reports', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const {
        testName,
        category,
        diagnosticLab,
        doctorPrescribed,
        resultsSummary,
        status,
        date,
        documentUrl,
        documentName,
        notes
    } = req.body;

    if (!testName || !category || !diagnosticLab || !resultsSummary) {
        return res.status(400).json({
            success: false,
            message: "Test name, category, diagnostic laboratory, and results summary are required."
        });
    }

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient) {
        return res.status(404).json({ success: false, message: "Patient not found." });
    }

    const todayStr = date || new Date().toISOString().split('T')[0];
    const newLabReport = {
        id: `LAB-${Date.now().toString().slice(-6)}`,
        date: todayStr,
        testName: testName.trim(),
        category: category.trim(),
        diagnosticLab: diagnosticLab.trim(),
        doctorPrescribed: doctorPrescribed ? doctorPrescribed.trim() : "Attending Physician",
        resultsSummary: resultsSummary.trim(),
        status: status || "Normal", // "Normal" | "Borderline High" | "Critical"
        documentUrl: documentUrl || "",
        documentName: documentName || "",
        notes: notes ? notes.trim() : ""
    };

    if (!targetPatient.labReports) targetPatient.labReports = [];
    targetPatient.labReports.unshift(newLabReport);
    targetPatient.lastUpdated = todayStr;

    await savePatients(patients);

    res.status(201).json({
        success: true,
        message: "Diagnostic lab report added successfully.",
        labReport: newLabReport,
        totalLabReports: targetPatient.labReports.length
    });
});

app.delete('/api/patients/:id/lab-reports/:index', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const index = parseInt(req.params.index, 10);

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient || !targetPatient.labReports || !targetPatient.labReports[index]) {
        return res.status(404).json({ success: false, message: "Lab report not found." });
    }

    const removed = targetPatient.labReports.splice(index, 1);
    await savePatients(patients);

    res.json({ success: true, message: "Lab report deleted successfully.", deletedReport: removed[0] });
});

// ==============================================================================
// 7. DOCTOR CONSULTATION & DISCHARGE REPORTS CRUD (DOCTOR ONLY)
// ==============================================================================
app.post('/api/patients/:id/doctor-reports', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const {
        reportType,
        doctorName,
        specialization,
        hospitalName,
        date,
        clinicalFindings,
        recommendations,
        documentUrl,
        documentName
    } = req.body;

    if (!reportType || !doctorName || !hospitalName || !clinicalFindings) {
        return res.status(400).json({
            success: false,
            message: "Report type, doctor name, hospital, and clinical findings are required."
        });
    }

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient) {
        return res.status(404).json({ success: false, message: "Patient not found." });
    }

    const todayStr = date || new Date().toISOString().split('T')[0];
    const newDoctorReport = {
        id: `DOC-REP-${Date.now().toString().slice(-6)}`,
        date: todayStr,
        reportType: reportType.trim(),
        doctorName: doctorName.trim(),
        specialization: specialization ? specialization.trim() : "Physician",
        hospitalName: hospitalName.trim(),
        clinicalFindings: clinicalFindings.trim(),
        recommendations: recommendations ? recommendations.trim() : "Follow up as clinically indicated.",
        documentUrl: documentUrl || "",
        documentName: documentName || ""
    };

    if (!targetPatient.doctorReports) targetPatient.doctorReports = [];
    targetPatient.doctorReports.unshift(newDoctorReport);
    targetPatient.lastUpdated = todayStr;

    await savePatients(patients);

    res.status(201).json({
        success: true,
        message: "Doctor consultation report added successfully.",
        doctorReport: newDoctorReport,
        totalDoctorReports: targetPatient.doctorReports.length
    });
});

app.delete('/api/patients/:id/doctor-reports/:index', async (req, res) => {
    const patientId = req.params.id.trim().toUpperCase();
    const index = parseInt(req.params.index, 10);

    const patients = await loadPatients();
    const targetPatient = patients.find(p => p.patientId.toUpperCase() === patientId);

    if (!targetPatient || !targetPatient.doctorReports || !targetPatient.doctorReports[index]) {
        return res.status(404).json({ success: false, message: "Doctor report not found." });
    }

    const removed = targetPatient.doctorReports.splice(index, 1);
    await savePatients(patients);

    res.json({ success: true, message: "Doctor report deleted successfully.", deletedReport: removed[0] });
});

// ==============================================================================
// 8. DATABASE RESET ENDPOINT
// ==============================================================================
app.post('/api/admin/reset', async (req, res) => {
    if (INITIAL_DEFAULT_PATIENTS) {
        await savePatients(INITIAL_DEFAULT_PATIENTS);
        return res.json({ success: true, message: "Patient database successfully reset to default records." });
    }
    res.status(500).json({ success: false, message: "Initial records unavailable to restore." });
});

// ==============================================================================
// 9. AI HEALTH SYMPTOM ASSISTANT ENDPOINT
// ==============================================================================
app.post('/api/ai/analyze-symptoms', async (req, res) => {
    const { symptoms, patientId, useHistory, apiKeyOverride, providerOverride } = req.body;

    if (!symptoms || !symptoms.trim()) {
        return res.status(400).json({ success: false, message: "Symptoms description is required." });
    }

    let historyContext = "";
    if (useHistory && patientId) {
        const patients = await loadPatients();
        const patient = patients.find(p => p.patientId.toUpperCase() === patientId.trim().toUpperCase());
        if (patient) {
            const diseaseNames = patient.diseases ? patient.diseases.map(d => d.diseaseName).join(", ") : "";
            historyContext = `Patient Major Conditions: ${patient.majorDiseases || 'None'}. Previous Diagnoses: ${diseaseNames || 'None'}.`;
        }
    }

    const activeProvider = (providerOverride || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const geminiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    const openaiKey = apiKeyOverride || process.env.OPENAI_API_KEY;

    if (activeProvider === 'gemini' && geminiKey && geminiKey.trim()) {
        try {
            console.log("Dispatching triage request to Google Gemini API...");
            const geminiResult = await callGoogleGeminiApi(geminiKey.trim(), symptoms, historyContext);
            return res.json({
                success: true,
                engine: "Google Gemini 1.5 Flash (Online AI)",
                ...geminiResult
            });
        } catch (err) {
            console.error("Gemini API call failed, falling back to rule engine:", err.message);
        }
    }

    if (activeProvider === 'openai' && openaiKey && openaiKey.trim()) {
        try {
            console.log("Dispatching triage request to OpenAI API...");
            const openaiResult = await callOpenAiApi(openaiKey.trim(), symptoms, historyContext);
            return res.json({
                success: true,
                engine: "OpenAI GPT-4o-mini (Online AI)",
                ...openaiResult
            });
        } catch (err) {
            console.error("OpenAI API call failed, falling back to rule engine:", err.message);
        }
    }

    if (activeProvider === 'custom' && process.env.CUSTOM_AI_ENDPOINT) {
        try {
            console.log("Dispatching triage request to Custom Online AI Endpoint...");
            const customResult = await callCustomOnlineAi(symptoms, historyContext);
            return res.json({
                success: true,
                engine: "Custom Online AI Service",
                ...customResult
            });
        } catch (err) {
            console.error("Custom AI call failed, falling back to rule engine:", err.message);
        }
    }

    // Default Fallback: Clinical Rule-Based Triage Engine
    const ruleResult = executeClinicalRuleEngine(symptoms);
    res.json({
        success: true,
        engine: "Clinical Rule Engine (Server Fallback)",
        ...ruleResult
    });
});

// AI Helper Functions
async function callGoogleGeminiApi(apiKey, symptoms, historyContext) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `
You are an AI Clinical Triage Assistant for the "HELP INDIA" healthcare portal prototype.
Patient Symptoms: "${symptoms}"
Patient Previous Certified Medical History Context: "${historyContext || 'None provided'}"

Analyze the symptoms and return ONLY a valid JSON object matching this schema:
{
  "urgency": "LOW" | "MODERATE" | "HIGH",
  "isEmergency": true | false,
  "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
  "guidance": ["Guidance point 1", "Guidance point 2", "Guidance point 3"],
  "recommendedNextStep": "Clear next action for the patient"
}

CRITICAL RULES:
1. If symptoms suggest acute myocardial infarction, acute stroke, pulmonary embolism, severe trauma, or acute respiratory distress, set "urgency": "HIGH", "isEmergency": true, and recommend calling emergency services (108/112).
2. DO NOT prescribe prescription-only antibiotics, steroids, or scheduled drugs. Only suggest supportive measures (hydration, rest, ORS, warm fluids, temperature monitoring).
3. Do not include markdown code ticks (\`\`\`json). Return raw JSON only.
`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
    });

    if (!response.ok) throw new Error(`Gemini HTTP Error ${response.status}: ${response.statusText}`);
    const data = await response.json();
    return extractJson(data.candidates[0].content.parts[0].text);
}

async function callOpenAiApi(apiKey, symptoms, historyContext) {
    const url = "https://api.openai.com/v1/chat/completions";
    const systemPrompt = `You are an AI Clinical Triage Assistant for the HELP INDIA healthcare portal. 
Return ONLY valid JSON matching this schema:
{
  "urgency": "LOW" | "MODERATE" | "HIGH",
  "isEmergency": true | false,
  "possibleCauses": ["Cause 1", "Cause 2", "Cause 3"],
  "guidance": ["Guidance 1", "Guidance 2", "Guidance 3"],
  "recommendedNextStep": "Clear next action"
}
Rules:
- Cardiac/stroke/severe respiratory red flags = urgency "HIGH", isEmergency true.
- Do NOT prescribe prescription drugs. Supportive advice only.`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Symptoms: "${symptoms}". History: "${historyContext}".` }
            ],
            temperature: 0.2
        })
    });

    if (!response.ok) throw new Error(`OpenAI HTTP Error ${response.status}`);
    const data = await response.json();
    return extractJson(data.choices[0].message.content);
}

async function callCustomOnlineAi(symptoms, historyContext) {
    const endpoint = process.env.CUSTOM_AI_ENDPOINT;
    const headers = { "Content-Type": "application/json" };
    if (process.env.CUSTOM_AI_API_KEY) headers["Authorization"] = `Bearer ${process.env.CUSTOM_AI_API_KEY}`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ symptoms, historyContext, timestamp: new Date().toISOString() })
    });

    if (!response.ok) throw new Error(`Custom AI Endpoint error ${response.status}`);
    const data = await response.json();
    if (data.urgency && data.possibleCauses) return data;
    return {
        urgency: data.urgency || "MODERATE",
        isEmergency: Boolean(data.isEmergency),
        possibleCauses: Array.isArray(data.possibleCauses) ? data.possibleCauses : [data.response || "Custom AI Analysis completed"],
        guidance: Array.isArray(data.guidance) ? data.guidance : ["Review advice with a certified physician."],
        recommendedNextStep: data.recommendedNextStep || "Consult your physician."
    };
}

function extractJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
    }
}

function executeClinicalRuleEngine(rawSymptoms) {
    const raw = (rawSymptoms || "").toLowerCase();
    const has = (w) => raw.includes(w);

    let urgency = "LOW";
    let isEmergency = false;
    let possibleCauses = [];
    let guidance = [];
    let recommendedNextStep = "";

    if ((has("chest pain") || has("chest tightness") || has("chest heaviness")) && (has("breath") || has("breathing") || has("shortness of breath") || has("dyspnea"))) {
        urgency = "HIGH";
        isEmergency = true;
        possibleCauses = ["Acute Coronary Syndrome / Myocardial Ischemia", "Pulmonary Embolism or Acute Bronchospasm", "Acute Respiratory Distress"];
        guidance = [
            "Cease all physical exertion and sit upright in a well-ventilated space",
            "Do not attempt to drive; contact national emergency ambulance services (108/112) immediately",
            "Loosen tight clothing around neck and chest"
        ];
        recommendedNextStep = "Seek emergency medical care immediately at the nearest cardiac or emergency hospital.";
    } else if (has("chest pain") || has("chest pressure")) {
        urgency = "HIGH";
        isEmergency = true;
        possibleCauses = ["Cardiac angina / ischemic heart disease", "Costochondritis / chest wall strain", "Gastroesophageal reflux (acid reflux)"];
        guidance = ["Rest immediately in a relaxed posture", "Monitor if pain radiates to left arm, neck, or jaw", "Check blood pressure and pulse"];
        recommendedNextStep = "Urgent medical evaluation recommended. Please visit the nearest emergency facility or clinic immediately.";
    } else if (has("difficulty breathing") || has("breathlessness") || has("shortness of breath") || has("wheezing")) {
        urgency = "HIGH";
        isEmergency = true;
        possibleCauses = ["Acute asthma exacerbation / COPD flare-up", "Lower respiratory infection (pneumonia)", "Cardiovascular congestion"];
        guidance = ["Sit upright and maintain fresh air circulation", "Check SpO2 with a digital pulse oximeter", "If prescribed, use rescue inhalers as directed"];
        recommendedNextStep = "Seek urgent clinical evaluation if SpO2 drops below 94% or breathing remains labored.";
    } else if (has("fever") && (has("body pain") || has("body ache") || has("joint pain") || has("headache"))) {
        urgency = "MODERATE";
        possibleCauses = ["Viral fever / seasonal influenza", "Vector-borne infection (Dengue, Chikungunya, Malaria)", "Systemic inflammatory response"];
        guidance = [
            "Maintain abundant oral fluid intake (clean water, oral rehydration solution, coconut water)",
            "Strict bed rest; avoid strenuous physical exertion",
            "Monitor body temperature every 4 hours with a thermometer",
            "Use physical cold compress or tepid sponging if fever rises above 101°F"
        ];
        recommendedNextStep = "Consult a physician for laboratory testing (Complete Blood Count / Platelet count) if fever persists beyond 48 hours.";
    } else if ((has("cough") || has("cold")) && (has("sore throat") || has("throat pain") || has("fever"))) {
        urgency = "LOW";
        possibleCauses = ["Upper respiratory tract infection (URTI)", "Seasonal viral pharyngitis", "Allergic airway irritation"];
        guidance = [
            "Sip warm liquids regularly (warm water, herbal broth)",
            "Perform warm saline gargles 3 times daily",
            "Steam inhalation for 5–10 minutes to relieve nasal congestion",
            "Avoid chilled, oily, or heavily spiced foods"
        ];
        recommendedNextStep = "Visit a primary care clinic if cough persists for more than a week or if breathing becomes uncomfortable.";
    } else if (has("vomiting") || has("diarrhea") || has("loose motions")) {
        urgency = (has("blood") || has("dizziness") || has("severe")) ? "HIGH" : "MODERATE";
        possibleCauses = ["Acute infective gastroenteritis (food-related illness)", "Intestinal microbial dysentery", "Food intolerance / acute dyspepsia"];
        guidance = [
            "Initiate WHO-standard Oral Rehydration Salts (ORS) in small, frequent sips",
            "Eat light, bland meals (khichdi, curd rice, plain toast, banana)",
            "Avoid dairy, spicy curries, fried snacks, and caffeine"
        ];
        recommendedNextStep = "Consult a doctor promptly if vomiting prevents fluid intake or if signs of severe dehydration develop.";
    } else if (has("abdominal") || has("stomach pain") || has("belly") || has("cramps")) {
        urgency = (has("severe") || has("unbearable")) ? "HIGH" : "MODERATE";
        possibleCauses = ["Acute gastritis / hyperacidity", "Spastic colon / indigestion", "Possible biliary, appendicular, or renal colic"];
        guidance = [
            "Avoid heavy, acidic, or fried foods",
            "Do not consume unprescribed painkiller tablets (NSAIDs) which irritate stomach lining",
            "Apply a gentle warm compress to the abdomen"
        ];
        recommendedNextStep = "Consult a doctor for abdominal examination and ultrasound if pain localizes to the right side.";
    } else if (has("headache")) {
        urgency = "LOW";
        possibleCauses = ["Tension headache from stress or lack of sleep", "Dehydration or digital eye fatigue", "Migraine episode"];
        guidance = [
            "Rest in a quiet, darkened room",
            "Drink 500ml of clean drinking water",
            "Take scheduled screen breaks and practice gentle neck stretches"
        ];
        recommendedNextStep = "Seek medical assessment if headache is sudden and intense, or accompanied by neck stiffness or vomiting.";
    } else {
        urgency = "LOW";
        possibleCauses = ["Non-specific symptoms requiring clinical evaluation", "Mild fatigue or physical exertion"];
        guidance = ["Ensure adequate hydration, wholesome meals, and restorative rest", "Maintain a log of symptoms and triggers"];
        recommendedNextStep = "Your symptoms do not match a predefined demo pattern. Please consult a qualified healthcare professional for proper evaluation.";
    }

    return { urgency, isEmergency, possibleCauses, guidance, recommendedNextStep };
}

// SPA Fallback: Serve frontend index.html for all non-API GET requests
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
    }
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    if (fsSync.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("HELP INDIA Portal API is active. Frontend index.html not found.");
    }
});

// ==============================================================================
// START SERVER
// ==============================================================================
app.listen(PORT, async () => {
    await loadPatients();
    await loadDoctors();
    console.log(`====================================================================`);
    console.log(` HELP INDIA – National Medical Disease History Portal API`);
    console.log(` Server running on: http://localhost:${PORT}`);
    console.log(` Uploads Folder:     ${UPLOADS_DIR}`);
    console.log(` Health Check:       http://localhost:${PORT}/api/health`);
    console.log(`====================================================================`);
});
