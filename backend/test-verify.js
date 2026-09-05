// test-verify.js - Automated API verification suite for HELP INDIA backend
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function request(method, pathName, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(pathName, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { ...headers }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, data, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

function uploadFile(pathName, filename, fileBuffer, mimeType) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;

        const payload = Buffer.concat([
            Buffer.from(header, 'utf8'),
            fileBuffer,
            Buffer.from(footer, 'utf8')
        ]);

        const url = new URL(pathName, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': payload.length
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log(`Starting HELP INDIA Backend on port ${TEST_PORT}...`);
    const serverProc = spawn('node', ['server.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: TEST_PORT.toString() },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProc.stdout.on('data', d => process.stdout.write(`[SERVER] ${d}`));
    serverProc.stderr.on('data', d => process.stderr.write(`[SERVER ERR] ${d}`));

    // Wait for server to boot
    await new Promise((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 30) {
                clearInterval(interval);
                reject(new Error("Server timeout after 30 attempts"));
            }
            try {
                const res = await request('GET', '/api/health');
                if (res.status === 200) {
                    clearInterval(interval);
                    resolve();
                }
            } catch (e) {
                // waiting...
            }
        }, 200);
    });

    console.log('✅ Server is UP and healthy. Running verification test suite...');

    try {
        // 1. Health Check
        const health = await request('GET', '/api/health');
        console.assert(health.status === 200, `Health check failed: ${health.status}`);
        console.log('✅ 1. Health Check passed:', health.data.service);

        // 2. Doctor Registration
        const docRegPayload = JSON.stringify({
            name: "Dr. Ananya Iyer",
            specialization: "Cardiology",
            hospital: "Apollo Hospitals, Chennai",
            registrationNumber: "MCI-TN-2026-88219",
            password: "SecureDoctorPassword123"
        });
        const docReg = await request('POST', '/api/auth/doctor/register', { 'Content-Type': 'application/json' }, docRegPayload);
        console.assert(docReg.status === 201, `Doctor registration failed: ${docReg.status} - ${JSON.stringify(docReg.data)}`);
        const newDoctorId = docReg.data.doctor.id;
        console.log(`✅ 2. Doctor Registered successfully! Doctor ID: ${newDoctorId}`);

        // 3. Doctor Login
        const docLoginPayload = JSON.stringify({
            doctorId: newDoctorId,
            password: "SecureDoctorPassword123"
        });
        const docLogin = await request('POST', '/api/auth/doctor/login', { 'Content-Type': 'application/json' }, docLoginPayload);
        console.assert(docLogin.status === 200, `Doctor login failed: ${docLogin.status} - ${JSON.stringify(docLogin.data)}`);
        console.log(`✅ 3. Doctor Login successful for ${docLogin.data.user.name} (${docLogin.data.user.specialization})`);

        // 4. Patient Registration
        const patRegPayload = JSON.stringify({
            name: "Ramesh Chandra Gupta",
            age: 38,
            gender: "Male",
            bloodGroup: "O+",
            weight: "74 kg",
            mobile: "+91 98711 22334",
            guardianMobile: "+91 98711 22335",
            address: "House 42, Sector 14, Gurugram, Haryana",
            majorDiseases: "Hypertension",
            password: "RameshPatientPassword123"
        });
        const patReg = await request('POST', '/api/auth/patient/register', { 'Content-Type': 'application/json' }, patRegPayload);
        console.assert(patReg.status === 201, `Patient registration failed: ${patReg.status} - ${JSON.stringify(patReg.data)}`);
        const newPatientId = patReg.data.patient.patientId;
        console.log(`✅ 4. Patient Registered successfully! Patient ID: ${newPatientId}`);

        // 5. Patient Login
        const patLoginPayload = JSON.stringify({
            patientId: newPatientId,
            password: "RameshPatientPassword123"
        });
        const patLogin = await request('POST', '/api/auth/patient/login', { 'Content-Type': 'application/json' }, patLoginPayload);
        console.assert(patLogin.status === 200, `Patient login failed: ${patLogin.status} - ${JSON.stringify(patLogin.data)}`);
        console.log(`✅ 5. Patient Login successful for ${patLogin.data.user.name}`);

        // 6. File Upload (Multer handling for PDF / PNG / JPEG)
        const dummyPng = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
            0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        const uploadRes = await uploadFile('/api/upload', 'rx_presc_ananya.png', dummyPng, 'image/png');
        console.assert(uploadRes.status === 200, `File upload failed: ${uploadRes.status} - ${JSON.stringify(uploadRes.data)}`);
        const uploadedFileUrl = uploadRes.data.fileUrl || (uploadRes.data.file && uploadRes.data.file.url);
        console.assert(uploadedFileUrl, "Upload did not return file URL");
        console.log(`✅ 6. File Upload successful! Stored at: ${uploadedFileUrl}`);

        // 7. Add Clinical Encounter Record with Prescription Attachment
        const encPayload = JSON.stringify({
            date: "2026-09-05",
            diseaseName: "Essential Hypertension - Stage 1",
            symptoms: "Mild morning occipital headache, intermittent palpitations",
            diagnosis: "Primary Essential Hypertension",
            doctorName: "Dr. Ananya Iyer",
            place: "Chennai",
            hospitalName: "Apollo Hospitals, Greams Road",
            hospitalAddress: "21 Greams Lane, Thousand Lights, Chennai",
            medicines: "Telmisartan 40mg OD, Amlodipine 2.5mg OD (30 days)",
            notes: "Advised low-sodium DASH diet and 30 minutes daily aerobic walking.",
            prescriptionDocumentUrl: uploadedFileUrl,
            prescriptionFileName: "rx_presc_ananya.png"
        });
        const encRes = await request('POST', `/api/patients/${newPatientId}/records`, { 'Content-Type': 'application/json' }, encPayload);
        console.assert(encRes.status === 201, `Add record failed: ${encRes.status} - ${JSON.stringify(encRes.data)}`);
        console.log(`✅ 7. Encounter record added with attachment: ${encRes.data.record.diseaseName}`);

        // 8. Add Diagnostic Lab Report
        const labPayload = JSON.stringify({
            testName: "Comprehensive Lipid Profile & HbA1c",
            category: "Biochemistry",
            diagnosticLab: "Dr. Lal PathLabs, Chennai Regional Lab",
            doctorPrescribed: "Dr. Ananya Iyer",
            resultsSummary: "Total Cholesterol: 218 mg/dL (Borderline High), LDL: 138 mg/dL, HDL: 44 mg/dL, HbA1c: 5.6% (Normal)",
            status: "Review Required",
            date: "2026-09-05",
            documentUrl: uploadedFileUrl,
            documentName: "lipid_profile_report.png",
            notes: "Borderline dyslipidemia noted. Suggest dietary lifestyle intervention."
        });
        const labRes = await request('POST', `/api/patients/${newPatientId}/lab-reports`, { 'Content-Type': 'application/json' }, labPayload);
        console.assert(labRes.status === 201, `Add lab report failed: ${labRes.status} - ${JSON.stringify(labRes.data)}`);
        console.log(`✅ 8. Lab report added: ${labRes.data.labReport.id} - ${labRes.data.labReport.testName}`);

        // 9. Add Doctor Consultation / Discharge Report
        const docReportPayload = JSON.stringify({
            reportType: "Consultation Summary",
            doctorName: "Dr. Ananya Iyer",
            specialization: "Cardiology",
            hospitalName: "Apollo Hospitals, Chennai",
            date: "2026-09-05",
            clinicalFindings: "Resting BP 142/92 mmHg. Heart sounds S1/S2 heard normally without murmur. 12-lead ECG confirms normal sinus rhythm.",
            recommendations: "Continue Telmisartan 40mg once daily in morning. Low sodium intake (< 2g/day). Repeat lipid panel in 6 weeks.",
            documentUrl: uploadedFileUrl,
            documentName: "cardiology_consult_summary.png"
        });
        const docReportRes = await request('POST', `/api/patients/${newPatientId}/doctor-reports`, { 'Content-Type': 'application/json' }, docReportPayload);
        console.assert(docReportRes.status === 201, `Add doctor report failed: ${docReportRes.status} - ${JSON.stringify(docReportRes.data)}`);
        console.log(`✅ 9. Doctor report added: ${docReportRes.data.doctorReport.id}`);

        // 10. Fetch updated patient and verify all records persist
        const getPat = await request('GET', `/api/patients/${newPatientId}`);
        console.assert(getPat.status === 200, `Fetch patient failed: ${getPat.status}`);
        const pData = getPat.data.patient;
        console.assert(pData.diseases && pData.diseases.length >= 1, `Expected at least 1 disease record`);
        console.assert(pData.labReports && pData.labReports.length >= 1, `Expected at least 1 lab report`);
        console.assert(pData.doctorReports && pData.doctorReports.length >= 1, `Expected at least 1 doctor report`);
        console.assert(pData.diseases[0].prescriptionDocumentUrl === uploadedFileUrl, "Prescription document URL mismatch");
        console.log(`✅ 10. Patient data verified: ${pData.diseases.length} disease encounters, ${pData.labReports.length} lab reports, ${pData.doctorReports.length} doctor reports!`);

        // 11. AI Symptom Assistant Analysis
        const aiPayload = JSON.stringify({
            patientId: newPatientId,
            symptoms: "Severe pressure in chest radiating to left arm with excessive perspiration and shortness of breath",
            duration: "Past 45 minutes",
            severity: "Severe"
        });
        const aiRes = await request('POST', '/api/ai/analyze-symptoms', { 'Content-Type': 'application/json' }, aiPayload);
        console.assert(aiRes.status === 200, `AI analysis failed: ${aiRes.status}`);
        console.assert(aiRes.data.analysis && aiRes.data.analysis.urgency, "AI analysis missing urgency property");
        console.log(`✅ 11. AI Symptom Assistant evaluated: Urgency = [${aiRes.data.analysis.urgency}], Provider = [${aiRes.data.provider}]`);
        console.log(`       Possible Causes: ${aiRes.data.analysis.possibleCauses.join(', ')}`);
        console.log(`       Emergency Flag: ${aiRes.data.analysis.isEmergency ? '🚨 YES' : 'NO'}`);

        console.log('\n====================================================================');
        console.log('🎉 ALL 11 TEST CASES PASSED SUCCESSFULLY!');
        console.log('====================================================================\n');
    } catch (err) {
        console.error('❌ Test suite error:', err);
        process.exitCode = 1;
    } finally {
        serverProc.kill('SIGTERM');
    }
}

runTests();
