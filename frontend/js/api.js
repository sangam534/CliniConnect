/**
 * HELP INDIA Portal - API Client
 * Clean, minimalistic fetch helper for backend REST calls
 */

const API_BASE_URL = window.location.protocol.startsWith("http")
    ? window.location.origin
    : "http://localhost:5000";

const api = {
    async get(endpoint, headers = {}) {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        });
        return res.json();
    },

    async post(endpoint, data, headers = {}) {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers
            },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async delete(endpoint, headers = {}) {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        });
        return res.json();
    },

    async uploadFile(fileInput) {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            return { fileUrl: "", fileName: "" };
        }
        const formData = new FormData();
        formData.append("document", fileInput.files[0]);

        const res = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "File upload failed.");
        return { fileUrl: json.fileUrl, fileName: json.fileName };
    }
};
