"""
Authentication routes for Doctors and Patients (No CAPTCHA)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
import random
from database import get_doctors, save_doctors, get_patients, save_patients
import phone_verification

router = APIRouter(prefix="/api/auth", tags=["auth"])


class DoctorLoginRequest(BaseModel):
    doctorId: str
    password: str


class DoctorRegisterRequest(BaseModel):
    name: str
    hospital: str
    specialization: Optional[str] = None
    specialty: Optional[str] = None
    registrationNumber: Optional[str] = None
    password: str
    requestedId: Optional[str] = None


class PatientLoginRequest(BaseModel):
    patientId: str
    password: str


class PatientLoginOtpRequest(BaseModel):
    phone_number: str
    otp: str
    session_id: str


class PatientRegisterRequest(BaseModel):
    name: str
    gender: str
    bloodGroup: str
    weight: Optional[str] = "65 kg"
    mobile: Optional[str] = None
    phone: Optional[str] = None
    guardianMobile: Optional[str] = None
    address: Optional[str] = "Address not provided"
    majorDiseases: Optional[str] = "None registered"
    password: str
    requestedId: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None


class SendOtpRequest(BaseModel):
    phone_number: str


class VerifyOtpRequest(BaseModel):
    session_id: str
    otp: str


@router.post("/doctor/login")
def doctor_login(req: DoctorLoginRequest):
    if not req.doctorId or not req.password:
        return {"success": False, "message": "Doctor ID and password are required."}

    doctors = get_doctors()
    doc = next((d for d in doctors if d.get("id", "").strip().upper() == req.doctorId.strip().upper()), None)

    if doc and doc.get("password") == req.password:
        clean_doc = {k: v for k, v in doc.items() if k != "password"}
        return {
            "success": True,
            "role": "doctor",
            "user": clean_doc,
            "doctor": clean_doc
        }

    return {
        "success": False,
        "message": "Invalid Doctor ID or password. Use demo account DOC1001 / doctor123 or register."
    }


@router.post("/doctor/register")
def doctor_register(req: DoctorRegisterRequest):
    spec = req.specialization or req.specialty
    if not req.name or not spec or not req.hospital or not req.password:
        return {"success": False, "message": "Name, specialization, hospital, and password are required."}

    doctors = get_doctors()
    doctor_id = (req.requestedId or "").strip().upper()

    if doctor_id:
        if any(d.get("id", "").strip().upper() == doctor_id for d in doctors):
            return {"success": False, "message": f"Doctor ID '{doctor_id}' is already registered."}
    else:
        # Auto-generate next DOC ID
        max_num = 1001
        for d in doctors:
            d_id = d.get("id", "")
            if d_id.upper().startswith("DOC") and d_id[3:].isdigit():
                num = int(d_id[3:])
                if num >= max_num:
                    max_num = num + 1
        doctor_id = f"DOC{max_num}"

    name_formatted = req.name.strip()
    if not name_formatted.startswith("Dr."):
        name_formatted = f"Dr. {name_formatted}"

    new_doc = {
        "id": doctor_id,
        "name": name_formatted,
        "password": req.password,
        "specialization": spec.strip(),
        "hospital": req.hospital.strip(),
        "registrationNumber": req.registrationNumber.strip() if req.registrationNumber else f"MCI-2026-{random.randint(10000, 99999)}",
        "registeredOn": date.today().isoformat()
    }

    doctors.append(new_doc)
    save_doctors(doctors)

    clean_doc = {k: v for k, v in new_doc.items() if k != "password"}
    return {
        "success": True,
        "message": "Doctor registration successful. You can now log in.",
        "doctor": clean_doc
    }


@router.post("/patient/login")
def patient_login(req: PatientLoginRequest):
    # Handle traditional password login
    if not req.patientId or not req.password:
        return {"success": False, "message": "Patient ID and password are required."}

    patients = get_patients()
    pat = next((p for p in patients if p.get("patientId", "").strip().upper() == req.patientId.strip().upper()), None)

    if pat and pat.get("password") == req.password:
        clean_pat = {k: v for k, v in pat.items() if k != "password"}
        return {
            "success": True,
            "role": "patient",
            "user": clean_pat,
            "patient": clean_pat
        }

    return {
        "success": False,
        "message": "Invalid Patient ID or password. Use demo accounts PAT1001-PAT1005 (patient123) or register."
    }


@router.post("/patient/login-otp")
def patient_login_otp(req: PatientLoginOtpRequest):
    # Handle OTP-based login
    if not req.phone_number or not req.otp or not req.session_id:
        return {"success": False, "message": "Phone number, OTP, and session ID are required."}

    try:
        is_valid = phone_verification.verify_otp(req.session_id, req.otp)
        if is_valid:
            # Find patient by phone number
            patients = get_patients()
            phone_number_clean = req.phone_number.lstrip('+')
            pat = next((p for p in patients if p.get("mobile", "").lstrip('+') == phone_number_clean), None)

            if pat:
                clean_pat = {k: v for k, v in pat.items() if k != "password"}
                return {
                    "success": True,
                    "role": "patient",
                    "user": clean_pat,
                    "patient": clean_pat
                }
            else:
                return {
                    "success": False,
                    "message": "Phone number not found in our records. Please register first."
                }
        else:
            return {
                "success": False,
                "message": "Incorrect OTP entered."
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error during OTP verification: {str(e)}"
        }


@router.post("/patient/register")
def patient_register(req: PatientRegisterRequest):
    mobile = req.mobile or req.phone
    age = req.age
    if not age and req.dob:
        try:
            birth_year = int(req.dob.split("-")[0])
            age = date.today().year - birth_year
        except Exception:
            age = 30

    if not req.name or not age or not req.gender or not req.bloodGroup or not mobile or not req.password:
        return {
            "success": False,
            "message": "Name, age, gender, blood group, mobile number, and password are required."
        }

    patients = get_patients()
    patient_id = (req.requestedId or "").strip().upper()

    if patient_id:
        if any(p.get("patientId", "").strip().upper() == patient_id for p in patients):
            return {"success": False, "message": f"Patient ID '{patient_id}' is already registered."}
    else:
        max_num = 1005
        for p in patients:
            p_id = p.get("patientId", "")
            if p_id.upper().startswith("PAT") and p_id[3:].isdigit():
                num = int(p_id[3:])
                if num >= max_num:
                    max_num = num + 1
        patient_id = f"PAT{max_num}"

    today_str = date.today().isoformat()
    weight = req.weight.strip() if req.weight else "65 kg"
    if weight and "kg" not in weight.lower():
        weight = f"{weight} kg"

    new_patient = {
        "id": patient_id,
        "patientId": patient_id,
        "password": req.password,
        "name": req.name.strip(),
        "age": int(age),
        "gender": req.gender.strip(),
        "bloodGroup": req.bloodGroup.strip(),
        "weight": weight,
        "mobile": mobile.strip(),
        "guardianMobile": (req.guardianMobile or mobile).strip(),
        "address": (req.address or "Address not provided").strip(),
        "majorDiseases": (req.majorDiseases or "None registered").strip(),
        "lastUpdated": today_str,
        "diseases": [],
        "labReports": [],
        "doctorReports": []
    }

    patients.append(new_patient)
    save_patients(patients)

    clean_pat = {k: v for k, v in new_patient.items() if k != "password"}
    return {
        "success": True,
        "message": "Citizen registration successful. Please note your Patient ID.",
        "patient": clean_pat
    }


@router.post("/send-otp")
def send_otp(req: SendOtpRequest):
    if not req.phone_number:
        return {"success": False, "message": "Phone number is required."}

    # Remove + if present for the API
    phone_number = req.phone_number.lstrip('+')

    try:
        session_id = phone_verification.send_otp(phone_number)
        if session_id:
            return {
                "success": True,
                "message": "OTP sent successfully",
                "session_id": session_id
            }
        else:
            return {
                "success": False,
                "message": "Failed to send OTP. Please check the phone number and try again."
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error sending OTP: {str(e)}"
        }


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    if not req.session_id or not req.otp:
        return {"success": False, "message": "Session ID and OTP are required."}

    try:
        is_valid = phone_verification.verify_otp(req.session_id, req.otp)
        if is_valid:
            return {
                "success": True,
                "message": "OTP verified successfully"
            }
        else:
            return {
                "success": False,
                "message": "Incorrect OTP entered."
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error verifying OTP: {str(e)}"
        }
