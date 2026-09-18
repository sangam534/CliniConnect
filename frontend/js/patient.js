/**
 * HELP INDIA Portal - Patient Dashboard & AI Assistant Module
 * Citizen portal with verified health history and NVIDIA AI Disease/Condition Summarize & Advice
 */

async function openPatientPortal() {
    showView("patientPortalSection");
    document.getElementById("patHeaderName").textContent = currentUser.name;
    document.getElementById("patHeaderId").textContent = currentUser.patientId;

    // Refresh patient data from backend
    try {
        const res = await api.get(`/api/patients/${currentUser.patientId}`, {
            "x-requester-role": "patient",
            "x-requester-id": currentUser.patientId
        });
        if (res.success && res.data) {
            currentUser = res.data;
        }
    } catch (e) {
        console.error("Failed refreshing patient data", e);
    }

    renderPatientProfile(currentUser);
    renderTables(currentUser, "pat");
    clearAiAssistant();
}

function renderPatientProfile(patient) {
    document.getElementById("patViewName").textContent = patient.name;
    document.getElementById("patViewId").textContent = patient.patientId;
    document.getElementById("patViewAgeGender").textContent = `${patient.age} Yrs / ${patient.gender}`;
    document.getElementById("patViewBlood").textContent = patient.bloodGroup;
    document.getElementById("patViewWeight").textContent = patient.weight || "N/A";
    document.getElementById("patViewMobile").textContent = patient.mobile;
    document.getElementById("patViewGuardian").textContent = patient.guardianMobile || patient.mobile;
    document.getElementById("patViewAddress").textContent = patient.address || "N/A";
    document.getElementById("patViewDiseases").textContent = patient.majorDiseases || "None";
}

/**
 * Disease & Condition AI Assistant (Summarize & Advice)
 * Connects directly to backend NVIDIA NIM OpenAI integration
 */
async function runConditionAssistant(action) {
    const inputEl = document.getElementById("patientConditionInput");
    const condition = inputEl.value.trim();

    if (!condition) {
        alert("Please describe your current diseases, symptoms, or medical conditions first.");
        inputEl.focus();
        return;
    }

    const useHistory = document.getElementById("includeHistoryCheckbox").checked;
    const loadingEl = document.getElementById("aiLoadingBox");
    const resultCard = document.getElementById("aiResultCard");
    const titleEl = document.getElementById("aiResultTitle");
    const contentEl = document.getElementById("aiResultContent");
    const badgeEl = document.getElementById("aiResultBadge");

    loadingEl.style.display = "flex";
    document.getElementById("aiLoadingText").textContent = action === "summarize"
        ? "Generating comprehensive clinical summary via NVIDIA AI..."
        : "Formulating medical guidance & supportive advice via NVIDIA AI...";

    try {
        const res = await api.post("/api/ai/condition-assistant", {
            condition,
            action,
            patientId: currentUser.patientId,
            useHistory
        });

        if (res.success) {
            titleEl.textContent = action === "summarize" ? "Clinical Condition Summary" : "Supportive Medical Advice";
            badgeEl.textContent = action === "summarize" ? "SUMMARY" : "CLINICAL GUIDANCE";
            badgeEl.className = action === "summarize" ? "status-badge normal" : "status-badge borderline";
            contentEl.textContent = res.result || "No response received.";
            resultCard.classList.add("visible");
            resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
            alert(res.message || "Failed to process request.");
        }
    } catch (err) {
        alert("Unable to reach AI service. Please verify backend server is active.");
    } finally {
        loadingEl.style.display = "none";
    }
}

function clearAiAssistant() {
    document.getElementById("patientConditionInput").value = "";
    document.getElementById("aiResultCard").classList.remove("visible");
    document.getElementById("includeHistoryCheckbox").checked = false;
}
