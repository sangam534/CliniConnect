/**
 * CliniConnect Portal - Doctor Dashboard Module
 * Accredited physician search, patient history inspection, and records management
 */

let selectedDoctorPatient = null;
let deleteTarget = { type: "", index: -1 };

async function openDoctorPortal() {
    showView("doctorPortalSection");
    document.getElementById("docHeaderName").textContent = currentUser.name;
    document.getElementById("docHeaderHospital").textContent = `${currentUser.specialization} • ${currentUser.hospital}`;

    // Clear search and selection
    document.getElementById("patientSearchInput").value = "";
    document.getElementById("doctorPatientDetails").style.display = "none";
    document.getElementById("patientNotFoundMsg").style.display = "none";
    selectedDoctorPatient = null;
}

async function searchPatient() {
    const query = document.getElementById("patientSearchInput").value.trim().toUpperCase();
    const notFoundEl = document.getElementById("patientNotFoundMsg");
    const detailsEl = document.getElementById("doctorPatientDetails");

    notFoundEl.style.display = "none";
    if (!query) return;

    try {
        const res = await api.get(`/api/patients/${query}`, { "x-requester-role": "doctor" });
        if (res.success && res.data) {
            selectedDoctorPatient = res.data;
            renderDoctorPatientView(res.data);
            detailsEl.style.display = "block";
        } else {
            selectedDoctorPatient = null;
            detailsEl.style.display = "none";
            notFoundEl.style.display = "block";
            notFoundEl.textContent = `No patient found with ID "${query}". Please check the ID or have the patient register.`;
        }
    } catch (e) {
        notFoundEl.style.display = "block";
        notFoundEl.textContent = "Error searching patient. Check server connection.";
    }
}

function renderDoctorPatientView(patient) {
    // Fill profile fields
    document.getElementById("docViewPatName").textContent = patient.name;
    document.getElementById("docViewPatId").textContent = patient.patientId;
    document.getElementById("docViewPatAgeGender").textContent = `${patient.age} Yrs / ${patient.gender}`;
    document.getElementById("docViewPatBlood").textContent = patient.bloodGroup;
    document.getElementById("docViewPatWeight").textContent = patient.weight || "N/A";
    document.getElementById("docViewPatMobile").textContent = patient.mobile;
    document.getElementById("docViewPatAddress").textContent = patient.address || "N/A";
    document.getElementById("docViewPatDiseases").textContent = patient.majorDiseases || "None";

    renderTables(patient, "doc");
}

function renderTables(patient, prefix) {
    const isDoc = (prefix === "doc");

    // 1. Disease Encounters Table
    const diseaseTbody = document.getElementById(`${prefix}DiseaseTableBody`);
    const diseases = patient.diseases || [];
    if (diseases.length === 0) {
        diseaseTbody.innerHTML = `<tr><td colspan="${isDoc ? 9 : 8}" class="table-empty-row">No clinical encounter records found.</td></tr>`;
    } else {
        diseaseTbody.innerHTML = diseases.map((r, idx) => `
            <tr>
                <td><strong>${escapeHtml(r.date)}</strong></td>
                <td><span style="font-weight:700; color:var(--primary-navy);">${escapeHtml(r.diseaseName)}</span></td>
                <td>${escapeHtml(r.symptoms)}</td>
                <td>${escapeHtml(r.diagnosis)}</td>
                <td><strong>${escapeHtml(r.doctorName)}</strong><br><small style="color:var(--text-muted);">${escapeHtml(r.hospitalName || '')}</small></td>
                <td><span style="font-size:0.85rem;">${escapeHtml(r.medicines)}</span></td>
                <td>${r.prescriptionDocumentUrl ? `
                    <button class="doc-attachment-pill" onclick="viewDocument('${r.prescriptionDocumentUrl}', '${escapeHtml(r.prescriptionFileName || 'Prescription')}')">
                        📄 View
                    </button>
                ` : '<span style="color:var(--text-muted);font-size:0.75rem;">None</span>'}</td>
                <td><small style="color:var(--text-muted);">${escapeHtml(r.notes || '-')}</small></td>
                ${isDoc ? `<td><button class="btn btn-danger-outline btn-sm" onclick="promptDelete('disease', ${idx})">Delete</button></td>` : ''}
            </tr>
        `).join("");
    }

    // 2. Lab Reports Table
    const labTbody = document.getElementById(`${prefix}LabTableBody`);
    const labs = patient.labReports || [];
    if (labs.length === 0) {
        labTbody.innerHTML = `<tr><td colspan="${isDoc ? 9 : 8}" class="table-empty-row">No diagnostic lab reports recorded.</td></tr>`;
    } else {
        labTbody.innerHTML = labs.map((l, idx) => {
            const statusClass = (l.status || "").toLowerCase().includes("critical") ? "critical" : (l.status || "").toLowerCase().includes("borderline") ? "borderline" : "normal";
            return `
            <tr>
                <td><code>${escapeHtml(l.id || `LAB-${idx+1}`)}</code></td>
                <td>${escapeHtml(l.date)}</td>
                <td><strong>${escapeHtml(l.testName)}</strong><br><small style="color:var(--text-muted);">${escapeHtml(l.category)}</small></td>
                <td>${escapeHtml(l.diagnosticLab)}</td>
                <td>${escapeHtml(l.doctorPrescribed || 'Physician')}</td>
                <td>${escapeHtml(l.resultsSummary)}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(l.status || 'Normal')}</span></td>
                <td>${l.documentUrl ? `
                    <button class="doc-attachment-pill" onclick="viewDocument('${l.documentUrl}', '${escapeHtml(l.documentName || l.testName)}')">
                        🧪 Report
                    </button>
                ` : '<span style="color:var(--text-muted);font-size:0.75rem;">None</span>'}</td>
                ${isDoc ? `<td><button class="btn btn-danger-outline btn-sm" onclick="promptDelete('lab', ${idx})">Delete</button></td>` : ''}
            </tr>
        `}).join("");
    }

    // 3. Doctor Reports Table
    const reportTbody = document.getElementById(`${prefix}ReportTableBody`);
    const reports = patient.doctorReports || [];
    if (reports.length === 0) {
        reportTbody.innerHTML = `<tr><td colspan="${isDoc ? 8 : 7}" class="table-empty-row">No consultation reports recorded.</td></tr>`;
    } else {
        reportTbody.innerHTML = reports.map((rep, idx) => `
            <tr>
                <td><code>${escapeHtml(rep.id || `DOC-REP-${idx+1}`)}</code></td>
                <td>${escapeHtml(rep.date)}</td>
                <td><strong>${escapeHtml(rep.reportType)}</strong></td>
                <td><strong>${escapeHtml(rep.doctorName)}</strong><br><small style="color:var(--text-muted);">${escapeHtml(rep.specialization || '')} (${escapeHtml(rep.hospitalName || '')})</small></td>
                <td>${escapeHtml(rep.clinicalFindings)}</td>
                <td><small style="color:var(--text-muted);">${escapeHtml(rep.recommendations || '-')}</small></td>
                <td>${rep.documentUrl ? `
                    <button class="doc-attachment-pill" onclick="viewDocument('${rep.documentUrl}', '${escapeHtml(rep.documentName || rep.reportType)}')">
                        🩺 View
                    </button>
                ` : '<span style="color:var(--text-muted);font-size:0.75rem;">None</span>'}</td>
                ${isDoc ? `<td><button class="btn btn-danger-outline btn-sm" onclick="promptDelete('doctorReport', ${idx})">Delete</button></td>` : ''}
            </tr>
        `).join("");
    }
}

// Add Clinical Record
function openAddDiseaseModal() {
    if (!selectedDoctorPatient) return;
    document.getElementById("addDiseaseForm").reset();
    document.getElementById("addRecordDoctor").value = currentUser ? currentUser.name : "";
    document.getElementById("addRecordHospital").value = currentUser ? currentUser.hospital : "";
    document.getElementById("addRecordDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("addRecordAlert").style.display = "none";
    openModal("addDiseaseModal");
}

async function handleAddDisease(e) {
    e.preventDefault();
    const alertEl = document.getElementById("addRecordAlert");
    alertEl.style.display = "none";

    try {
        // Upload prescription if attached
        const fileInput = document.getElementById("addRecordFile");
        const uploadMeta = await api.uploadFile(fileInput);

        const record = {
            date: document.getElementById("addRecordDate").value,
            diseaseName: document.getElementById("addRecordDisease").value.trim(),
            doctorName: document.getElementById("addRecordDoctor").value.trim(),
            hospitalName: document.getElementById("addRecordHospital").value.trim(),
            symptoms: document.getElementById("addRecordSymptoms").value.trim(),
            diagnosis: document.getElementById("addRecordDiagnosis").value.trim(),
            place: document.getElementById("addRecordPlace").value.trim(),
            medicines: document.getElementById("addRecordMedicines").value.trim(),
            notes: document.getElementById("addRecordNotes").value.trim(),
            prescriptionDocumentUrl: uploadMeta.fileUrl,
            prescriptionFileName: uploadMeta.fileName
        };

        const json = await api.post(`/api/patients/${selectedDoctorPatient.patientId}/records`, record);
        if (json.success) {
            closeModal("addDiseaseModal");
            searchPatient();
        } else {
            showAlert("addRecordAlert", json.message || "Failed to add record.");
        }
    } catch (err) {
        showAlert("addRecordAlert", err.message || "Error submitting record.");
    }
}

// Add Lab Report
function openAddLabModal() {
    if (!selectedDoctorPatient) return;
    document.getElementById("addLabForm").reset();
    document.getElementById("labPrescribedBy").value = currentUser ? currentUser.name : "";
    document.getElementById("addLabAlert").style.display = "none";
    openModal("addLabModal");
}

async function handleAddLab(e) {
    e.preventDefault();
    const alertEl = document.getElementById("addLabAlert");
    alertEl.style.display = "none";

    try {
        const fileInput = document.getElementById("labDocumentFile");
        const uploadMeta = await api.uploadFile(fileInput);

        const report = {
            testName: document.getElementById("labTestName").value.trim(),
            category: document.getElementById("labCategory").value.trim(),
            diagnosticLab: document.getElementById("labDiagnosticLab").value.trim(),
            doctorPrescribed: document.getElementById("labPrescribedBy").value.trim(),
            status: document.getElementById("labStatus").value,
            resultsSummary: document.getElementById("labResultsSummary").value.trim(),
            notes: document.getElementById("labNotes").value.trim(),
            documentUrl: uploadMeta.fileUrl,
            documentName: uploadMeta.fileName
        };

        const json = await api.post(`/api/patients/${selectedDoctorPatient.patientId}/lab-reports`, report);
        if (json.success) {
            closeModal("addLabModal");
            searchPatient();
        } else {
            showAlert("addLabAlert", json.message || "Failed to add lab report.");
        }
    } catch (err) {
        showAlert("addLabAlert", err.message || "Error submitting lab report.");
    }
}

// Add Doctor Consultation Report
function openAddDoctorReportModal() {
    if (!selectedDoctorPatient) return;
    document.getElementById("addDocReportForm").reset();
    if (currentUser) {
        document.getElementById("docRepName").value = currentUser.name;
        document.getElementById("docRepSpecialization").value = currentUser.specialization || "";
        document.getElementById("docRepHospital").value = currentUser.hospital || "";
    }
    document.getElementById("addDocReportAlert").style.display = "none";
    openModal("addDocReportModal");
}

async function handleAddDoctorReport(e) {
    e.preventDefault();
    const alertEl = document.getElementById("addDocReportAlert");
    alertEl.style.display = "none";

    try {
        const fileInput = document.getElementById("docRepDocumentFile");
        const uploadMeta = await api.uploadFile(fileInput);

        const report = {
            reportType: document.getElementById("docRepType").value.trim(),
            doctorName: document.getElementById("docRepName").value.trim(),
            specialization: document.getElementById("docRepSpecialization").value.trim(),
            hospitalName: document.getElementById("docRepHospital").value.trim(),
            clinicalFindings: document.getElementById("docRepFindings").value.trim(),
            recommendations: document.getElementById("docRepRecommendations").value.trim(),
            documentUrl: uploadMeta.fileUrl,
            documentName: uploadMeta.fileName
        };

        const json = await api.post(`/api/patients/${selectedDoctorPatient.patientId}/doctor-reports`, report);
        if (json.success) {
            closeModal("addDocReportModal");
            searchPatient();
        } else {
            showAlert("addDocReportAlert", json.message || "Failed to add report.");
        }
    } catch (err) {
        showAlert("addDocReportAlert", err.message || "Error submitting consultation report.");
    }
}

// Delete Handler
function promptDelete(type, index) {
    deleteTarget = { type, index };
    const label = type === "disease" ? "Clinical Encounter" : type === "lab" ? "Lab Report" : "Doctor Consultation Report";
    document.getElementById("deleteConfirmText").textContent = `Are you sure you want to delete this ${label}?`;
    openModal("deleteConfirmModal");
}

async function executeDelete() {
    if (!selectedDoctorPatient || deleteTarget.index < 0) return;
    const patId = selectedDoctorPatient.patientId;
    let endpoint = "";

    if (deleteTarget.type === "disease") endpoint = `/api/patients/${patId}/records/${deleteTarget.index}`;
    else if (deleteTarget.type === "lab") endpoint = `/api/patients/${patId}/lab-reports/${deleteTarget.index}`;
    else if (deleteTarget.type === "doctorReport") endpoint = `/api/patients/${patId}/doctor-reports/${deleteTarget.index}`;

    if (endpoint) {
        await api.delete(endpoint);
        closeModal("deleteConfirmModal");
        searchPatient();
    }
}
