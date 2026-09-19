/**
 * CliniConnect Portal - Patient Dashboard & AI Assistant Module
 * Citizen portal with verified health history and DeepSeek AI Disease/Condition Summarize & Advice
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
    initVoiceAssistantWidget();
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
 * Connects directly to backend DeepSeek AI integration
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

    const reasoningContainer = document.getElementById("aiReasoningContainer");
    const reasoningContent = document.getElementById("aiReasoningContent");

    loadingEl.style.display = "flex";
    document.getElementById("aiLoadingText").textContent = action === "summarize"
        ? "Generating comprehensive clinical summary via DeepSeek AI..."
        : "Formulating medical guidance & supportive advice via DeepSeek AI...";

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

            if (res.reasoning && res.reasoning.trim() && reasoningContainer && reasoningContent) {
                reasoningContent.textContent = res.reasoning;
                reasoningContainer.style.display = "block";
            } else if (reasoningContainer) {
                reasoningContainer.style.display = "none";
            }

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
    const reasoningContainer = document.getElementById("aiReasoningContainer");
    if (reasoningContainer) reasoningContainer.style.display = "none";
    const reasoningContent = document.getElementById("aiReasoningContent");
    if (reasoningContent) reasoningContent.textContent = "";
    document.getElementById("includeHistoryCheckbox").checked = false;
}

/**
 * Voice Assistant Widget Controller
 * Floating Action Button & Voice Chat Widget drawer with direct AI Studio redirection
 */
function initVoiceAssistantWidget() {
    const container = document.getElementById("voiceAssistantContainer");
    const widget = document.getElementById("voiceChatWidgetCard");
    const bubble = document.getElementById("voiceFabPromptBubble");
    const fabMic = document.getElementById("fabIconMic");
    const fabClose = document.getElementById("fabIconClose");

    if (container) container.style.display = "flex";
    if (widget) {
        widget.style.display = "none";
        widget.classList.remove("open");
    }
    if (fabMic) fabMic.style.display = "inline";
    if (fabClose) fabClose.style.display = "none";

    // Show friendly greeting bubble on login
    if (bubble) {
        bubble.style.display = "flex";
        bubble.style.opacity = "1";
        setTimeout(() => {
            if (bubble && widget && !widget.classList.contains("open")) {
                bubble.style.opacity = "0";
                setTimeout(() => {
                    bubble.style.display = "none";
                    bubble.style.opacity = "1";
                }, 300);
            }
        }, 7000);
    }
}

function toggleVoiceChatWidget(forceState) {
    const widget = document.getElementById("voiceChatWidgetCard");
    const fabMic = document.getElementById("fabIconMic");
    const fabClose = document.getElementById("fabIconClose");
    const bubble = document.getElementById("voiceFabPromptBubble");

    if (!widget) return;

    const isCurrentlyOpen = widget.style.display === "block" || widget.classList.contains("open");
    const shouldOpen = typeof forceState === "boolean" ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
        widget.style.display = "block";
        widget.classList.add("open");
        if (fabMic) fabMic.style.display = "none";
        if (fabClose) fabClose.style.display = "inline";
        if (bubble) bubble.style.display = "none";
    } else {
        widget.style.display = "none";
        widget.classList.remove("open");
        if (fabMic) fabMic.style.display = "inline";
        if (fabClose) fabClose.style.display = "none";
    }
}

function dismissVoiceBubble(e) {
    if (e) e.stopPropagation();
    const bubble = document.getElementById("voiceFabPromptBubble");
    if (bubble) bubble.style.display = "none";
}

// Global click handler to close voice chat widget when clicking outside
document.addEventListener("click", (e) => {
    const container = document.getElementById("voiceAssistantContainer");
    const widget = document.getElementById("voiceChatWidgetCard");
    if (container && widget && widget.classList.contains("open")) {
        if (!container.contains(e.target)) {
            toggleVoiceChatWidget(false);
        }
    }
});

