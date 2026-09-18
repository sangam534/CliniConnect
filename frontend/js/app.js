/**
 * HELP INDIA Portal - Main Application Orchestrator
 * View switching, modals, tabs, document previews, and initialization
 */

const ALL_VIEWS = [
    "roleSelectionSection",
    "doctorLoginSection",
    "patientLoginSection",
    "doctorPortalSection",
    "patientPortalSection"
];

function showView(viewId) {
    ALL_VIEWS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? "block" : "none";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showRoleSelection() {
    showView("roleSelectionSection");
}

function showDoctorLogin() {
    showView("doctorLoginSection");
    document.getElementById("docLoginAlert").style.display = "none";
    document.getElementById("docIdInput").value = "DOC1001";
    document.getElementById("docPasswordInput").value = "doctor123";
}

function showPatientLogin() {
    showView("patientLoginSection");
    document.getElementById("patientLoginAlert").style.display = "none";
    document.getElementById("patientIdInput").value = "PAT1001";
    document.getElementById("patientPasswordInput").value = "patient123";
}

// Tab Switching
function switchTab(containerId, targetTabId, clickedBtn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove active from buttons
    const nav = clickedBtn.closest(".portal-nav-tabs");
    if (nav) {
        nav.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    }
    clickedBtn.classList.add("active");

    // Hide all tab panes in this container
    container.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
    const target = document.getElementById(targetTabId);
    if (target) target.classList.add("active");
}

// Modal Helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
}

// Document Preview
function viewDocument(docUrl, docName) {
    if (!docUrl || docUrl.trim() === "") {
        alert("This record does not have an attached digital file.");
        return;
    }

    const fullUrl = docUrl.startsWith("http") ? docUrl : `${API_BASE_URL}${docUrl}`;
    document.getElementById("docViewerTitle").textContent = docName || "Medical Document";
    document.getElementById("docViewerDownloadBtn").href = fullUrl;

    const contentEl = document.getElementById("docViewerContent");
    const isPdf = docUrl.toLowerCase().endsWith(".pdf") || (docName && docName.toLowerCase().endsWith(".pdf"));

    if (isPdf) {
        contentEl.innerHTML = `
            <div style="padding: 24px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">📑</div>
                <h4 style="margin-bottom: 8px; color: var(--primary-navy);">${escapeHtml(docName)}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                    Certified PDF document stored securely on Help India server.
                </p>
                <a href="${fullUrl}" target="_blank" class="btn btn-primary">
                    Open PDF in New Window
                </a>
            </div>
        `;
    } else {
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 10px;">
                <img src="${fullUrl}" alt="${escapeHtml(docName)}" style="max-width: 100%; max-height: 65vh; border-radius: 6px; box-shadow: var(--shadow-md);">
            </div>
        `;
    }

    openModal("documentViewerModal");
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// App Initialization
window.addEventListener("DOMContentLoaded", () => {
    showRoleSelection();

    // Close modals when clicking backdrop
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-backdrop")) {
            e.target.classList.remove("open");
        }
    });
});
