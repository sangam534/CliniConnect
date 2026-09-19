/**
 * CliniConnect Portal - Authentication Module
 * Clean, lightweight doctor and patient authentication (NO CAPTCHA)
 */

let currentUser = null;
let currentRole = null;

// Doctor Login
async function handleDoctorLogin(e) {
    e.preventDefault();
    const doctorId = document.getElementById("docIdInput").value.trim();
    const password = document.getElementById("docPasswordInput").value;
    const alertEl = document.getElementById("docLoginAlert");
    alertEl.style.display = "none";

    try {
        const json = await api.post("/api/auth/doctor/login", { doctorId, password });
        if (json.success) {
            currentUser = json.doctor;
            currentRole = "doctor";
            try {
                sessionStorage.setItem("cliniconnect_user", JSON.stringify(currentUser));
                sessionStorage.setItem("cliniconnect_role", "doctor");
            } catch (err) {}
            openDoctorPortal();
        } else {
            showAlert("docLoginAlert", json.message || "Invalid doctor credentials.");
        }
    } catch (err) {
        showAlert("docLoginAlert", "Cannot reach backend server. Please ensure backend is running.");
    }
}

// Doctor Registration
async function handleDoctorRegister(e) {
    e.preventDefault();
    const alertEl = document.getElementById("docRegAlert");
    alertEl.style.display = "none";

    const name = document.getElementById("regDocName").value.trim();
    const specialization = document.getElementById("regDocSpecialization").value.trim();
    const hospital = document.getElementById("regDocHospital").value.trim();
    const registrationNumber = document.getElementById("regDocRegNo").value.trim();
    const password = document.getElementById("regDocPassword").value;

    try {
        const json = await api.post("/api/auth/doctor/register", {
            name,
            specialization,
            hospital,
            registrationNumber,
            password
        });
        if (json.success) {
            closeModal("doctorRegisterModal");
            document.getElementById("docIdInput").value = json.doctor.id;
            document.getElementById("docPasswordInput").value = password;
            showAlert("docLoginAlert", `Accredited! Your Doctor ID is ${json.doctor.id}. Please sign in.`, "success");
        } else {
            showAlert("docRegAlert", json.message || "Registration failed.");
        }
    } catch (err) {
        showAlert("docRegAlert", "Registration error. Ensure backend is running.");
    }
}

// Patient Login
async function handlePatientLogin(e) {
    e.preventDefault();
    const patientId = document.getElementById("patientIdInput").value.trim();
    const password = document.getElementById("patientPasswordInput").value;
    const alertEl = document.getElementById("patientLoginAlert");
    alertEl.style.display = "none";

    try {
        const json = await api.post("/api/auth/patient/login", { patientId, password });
        if (json.success) {
            currentUser = json.patient;
            currentRole = "patient";
            try {
                sessionStorage.setItem("cliniconnect_user", JSON.stringify(currentUser));
                sessionStorage.setItem("cliniconnect_role", "patient");
            } catch (err) {}
            openPatientPortal();
        } else {
            showAlert("patientLoginAlert", json.message || "Invalid patient ID or password.");
        }
    } catch (err) {
        showAlert("patientLoginAlert", "Cannot reach backend server. Please ensure backend is running.");
    }
}

// Patient Registration
async function handlePatientRegister(e) {
    e.preventDefault();
    const alertEl = document.getElementById("patRegAlert");
    alertEl.style.display = "none";

    const name = document.getElementById("regPatName").value.trim();
    const age = parseInt(document.getElementById("regPatAge").value, 10);
    const gender = document.getElementById("regPatGender").value;
    const bloodGroup = document.getElementById("regPatBloodGroup").value;
    const weight = document.getElementById("regPatWeight").value.trim();
    const mobile = document.getElementById("regPatMobile").value.trim();
    const guardianMobile = document.getElementById("regPatGuardianMobile").value.trim();
    const address = document.getElementById("regPatAddress").value.trim();
    const majorDiseases = document.getElementById("regPatMajorDiseases").value.trim();
    const password = document.getElementById("regPatPassword").value;

    try {
        const json = await api.post("/api/auth/patient/register", {
            name,
            age,
            gender,
            bloodGroup,
            weight,
            mobile,
            guardianMobile,
            address,
            majorDiseases,
            password
        });
        if (json.success) {
            closeModal("patientRegisterModal");
            document.getElementById("patientIdInput").value = json.patient.patientId;
            document.getElementById("patientPasswordInput").value = password;
            showAlert("patientLoginAlert", `Registered! Your Patient ID is ${json.patient.patientId}. Please sign in.`, "success");
        } else {
            showAlert("patRegAlert", json.message || "Registration failed.");
        }
    } catch (err) {
        showAlert("patRegAlert", "Registration error. Ensure backend is running.");
    }
}

function handleLogout() {
    currentUser = null;
    currentRole = null;
    window.otpSessionId = null;
    if (typeof toggleVoiceChatWidget === "function") {
        toggleVoiceChatWidget(false);
    }
    try {
        sessionStorage.removeItem("cliniconnect_user");
        sessionStorage.removeItem("cliniconnect_role");
    } catch (err) {}
    showRoleSelection();
}

function showAlert(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `form-alert ${type}`;
    el.style.display = "block";
}

// Send OTP
async function handleSendOtp() {
    const phoneNumber = document.getElementById("patientPhoneInput").value.trim();
    const alertEl = document.getElementById("patientLoginAlert");
    alertEl.style.display = "none";

    if (!phoneNumber) {
        showAlert("patientLoginAlert", "Please enter your mobile number.");
        return;
    }

    if (!phoneNumber.startsWith("+")) {
        showAlert("patientLoginAlert", "Please enter mobile number with country code (e.g., +91)");
        return;
    }

    try {
        const json = await api.post("/api/auth/send-otp", { phone_number: phoneNumber });
        if (json.success) {
            window.otpSessionId = json.session_id;
            document.getElementById("otpSection").style.display = "block";
            document.getElementById("sendOtpBtn").style.display = "none";
            document.getElementById("verifyOtpBtn").style.display = "block";
            showAlert("patientLoginAlert", "OTP sent successfully. Please check your mobile.", "success");
        } else {
            showAlert("patientLoginAlert", json.message || "Failed to send OTP. Please try again.");
        }
    } catch (err) {
        showAlert("patientLoginAlert", "Cannot reach backend server. Please ensure backend is running.");
    }
}

// Handle OTP Login
async function handlePatientOtpLogin(e) {
    e.preventDefault();
    const phoneNumber = document.getElementById("patientPhoneInput").value.trim();
    const otp = document.getElementById("patientOtpInput").value.trim();
    const alertEl = document.getElementById("patientLoginAlert");
    alertEl.style.display = "none";

    if (!phoneNumber || !otp || !window.otpSessionId) {
        showAlert("patientLoginAlert", "Mobile number, OTP, and session are required.");
        return;
    }

    try {
        const json = await api.post("/api/auth/patient/login-otp", {
            phone_number: phoneNumber,
            otp: otp,
            session_id: window.otpSessionId
        });
        if (json.success) {
            currentUser = json.patient;
            currentRole = "patient";
            try {
                sessionStorage.setItem("cliniconnect_user", JSON.stringify(currentUser));
                sessionStorage.setItem("cliniconnect_role", "patient");
            } catch (err) {}
            openPatientPortal();
        } else {
            showAlert("patientLoginAlert", json.message || "Invalid OTP or phone number.");
        }
    } catch (err) {
        showAlert("patientLoginAlert", "Cannot reach backend server. Please ensure backend is running.");
    }
}
