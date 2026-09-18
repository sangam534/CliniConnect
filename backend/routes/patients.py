"""
Patient directory, profiles, and clinical records CRUD endpoints
"""
from fastapi import APIRouter, Header, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date
import time
from database import get_patients, save_patients, reset_to_initial_patients

router = APIRouter(prefix="/api", tags=["patients"])


# Pydantic models for incoming records
class DiseaseRecordCreate(BaseModel):
    date: str
    diseaseName: str
    symptoms: str
    diagnosis: str
    doctorName: str
    place: str
    hospitalName: str
    medicines: str
    hospitalAddress: Optional[str] = ""
    notes: Optional[str] = ""
    prescriptionDocumentUrl: Optional[str] = ""
    prescriptionFileName: Optional[str] = ""


class LabReportCreate(BaseModel):
    testName: str
    category: str
    diagnosticLab: str
    resultsSummary: str
    status: Optional[str] = "Normal"
    doctorPrescribed: Optional[str] = "Attending Physician"
    date: Optional[str] = None
    documentUrl: Optional[str] = ""
    documentName: Optional[str] = ""
    notes: Optional[str] = ""


class DoctorReportCreate(BaseModel):
    reportType: str
    doctorName: str
    hospitalName: str
    clinicalFindings: str
    specialization: Optional[str] = "Physician"
    recommendations: Optional[str] = "Follow up as clinically indicated."
    date: Optional[str] = None
    documentUrl: Optional[str] = ""
    documentName: Optional[str] = ""


# 1. Directory of patients (for doctor overview)
@router.get("/patients")
def list_patients(x_requester_role: Optional[str] = Header(None), requesterRole: Optional[str] = Query(None)):
    role = x_requester_role or requesterRole
    if role != "doctor":
        return {
            "success": False,
            "message": "Access forbidden. Only accredited healthcare practitioners can inspect the patient directory."
        }

    patients = get_patients()
    summary = []
    for p in patients:
        summary.append({
            "patientId": p.get("patientId"),
            "name": p.get("name"),
            "age": p.get("age"),
            "gender": p.get("gender"),
            "bloodGroup": p.get("bloodGroup"),
            "majorDiseases": p.get("majorDiseases"),
            "lastUpdated": p.get("lastUpdated"),
            "totalDiseases": len(p.get("diseases", [])),
            "totalLabReports": len(p.get("labReports", [])),
            "totalDoctorReports": len(p.get("doctorReports", []))
        })
    return {"success": True, "count": len(summary), "data": summary}


# 2. Single patient record
@router.get("/patients/{patient_id}")
def get_patient(
    patient_id: str,
    x_requester_role: Optional[str] = Header(None),
    x_requester_id: Optional[str] = Header(None),
    requesterRole: Optional[str] = Query(None),
    requesterId: Optional[str] = Query(None)
):
    pid = patient_id.strip().upper()
    role = x_requester_role or requesterRole or "doctor"
    req_id = (x_requester_id or requesterId or "").strip().upper()

    # Data privacy check for patient role
    if role == "patient" and req_id and req_id != pid:
        return {
            "success": False,
            "message": f"Access denied. Patient {req_id} cannot access records of {pid}."
        }

    patients = get_patients()
    patient = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not patient:
        return {"success": False, "message": "Patient record not found."}

    clean_profile = {k: v for k, v in patient.items() if k != "password"}
    clean_profile.setdefault("diseases", [])
    clean_profile.setdefault("labReports", [])
    clean_profile.setdefault("doctorReports", [])

    return {"success": True, "data": clean_profile}


# 3. Add Clinical Disease Encounter & Prescription
@router.post("/patients/{patient_id}/records")
def add_disease_record(patient_id: str, record: DiseaseRecordCreate):
    pid = patient_id.strip().upper()
    patients = get_patients()
    target = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not target:
        return {"success": False, "message": "Target patient not found."}

    new_record = record.dict()
    if "diseases" not in target or not isinstance(target["diseases"], list):
        target["diseases"] = []

    target["diseases"].insert(0, new_record)
    target["lastUpdated"] = record.date
    save_patients(patients)

    return {
        "success": True,
        "message": "Clinical disease record and prescription added successfully.",
        "totalRecords": len(target["diseases"]),
        "lastUpdated": target["lastUpdated"],
        "record": new_record
    }


# 4. Delete Clinical Disease Record
@router.delete("/patients/{patient_id}/records/{index}")
def delete_disease_record(patient_id: str, index: int):
    pid = patient_id.strip().upper()
    patients = get_patients()
    target = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not target or "diseases" not in target or index < 0 or index >= len(target["diseases"]):
        return {"success": False, "message": "Medical record not found at index."}

    removed = target["diseases"].pop(index)
    save_patients(patients)
    return {"success": True, "message": "Medical record deleted.", "deletedRecord": removed}


# 5. Add Diagnostic Lab Report
@router.post("/patients/{patient_id}/lab-reports")
def add_lab_report(patient_id: str, report: LabReportCreate):
    pid = patient_id.strip().upper()
    patients = get_patients()
    target = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not target:
        return {"success": False, "message": "Target patient not found."}

    today_str = report.date or date.today().isoformat()
    new_lab = {
        "id": f"LAB-{str(int(time.time()))[-6:]}",
        "date": today_str,
        "testName": report.testName.strip(),
        "category": report.category.strip(),
        "diagnosticLab": report.diagnosticLab.strip(),
        "doctorPrescribed": report.doctorPrescribed.strip() if report.doctorPrescribed else "Attending Physician",
        "resultsSummary": report.resultsSummary.strip(),
        "status": report.status or "Normal",
        "documentUrl": report.documentUrl or "",
        "documentName": report.documentName or "",
        "notes": (report.notes or "").strip()
    }

    if "labReports" not in target or not isinstance(target["labReports"], list):
        target["labReports"] = []

    target["labReports"].insert(0, new_lab)
    target["lastUpdated"] = today_str
    save_patients(patients)

    return {
        "success": True,
        "message": "Diagnostic lab report added successfully.",
        "labReport": new_lab,
        "totalLabReports": len(target["labReports"])
    }


# 6. Delete Diagnostic Lab Report
@router.delete("/patients/{patient_id}/lab-reports/{index}")
def delete_lab_report(patient_id: str, index: int):
    pid = patient_id.strip().upper()
    patients = get_patients()
    target = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not target or "labReports" not in target or index < 0 or index >= len(target["labReports"]):
        return {"success": False, "message": "Lab report not found."}

    removed = target["labReports"].pop(index)
    save_patients(patients)
    return {"success": True, "message": "Lab report deleted.", "deletedReport": removed}


# 7. Add Doctor Consultation / Discharge Report
@router.post("/patients/{patient_id}/doctor-reports")
def add_doctor_report(patient_id: str, report: DoctorReportCreate):
    pid = patient_id.strip().upper()
    patients = get_patients()
    target = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not target:
        return {"success": False, "message": "Target patient not found."}

    today_str = report.date or date.today().isoformat()
    new_doc_rep = {
        "id": f"DOC-REP-{str(int(time.time()))[-6:]}",
        "date": today_str,
        "reportType": report.reportType.strip(),
        "doctorName": report.doctorName.strip(),
        "specialization": (report.specialization or "Physician").strip(),
        "hospitalName": report.hospitalName.strip(),
        "clinicalFindings": report.clinicalFindings.strip(),
        "recommendations": (report.recommendations or "Follow up as clinically indicated.").strip(),
        "documentUrl": report.documentUrl or "",
        "documentName": report.documentName or ""
    }

    if "doctorReports" not in target or not isinstance(target["doctorReports"], list):
        target["doctorReports"] = []

    target["doctorReports"].insert(0, new_doc_rep)
    target["lastUpdated"] = today_str
    save_patients(patients)

    return {
        "success": True,
        "message": "Doctor consultation report added successfully.",
        "doctorReport": new_doc_rep,
        "totalDoctorReports": len(target["doctorReports"])
    }


# 8. Delete Doctor Report
@router.delete("/patients/{patient_id}/doctor-reports/{index}")
def delete_doctor_report(patient_id: str, index: int):
    pid = patient_id.strip().upper()
    patients = get_patients()
    target = next((p for p in patients if p.get("patientId", "").strip().upper() == pid), None)
    if not target or "doctorReports" not in target or index < 0 or index >= len(target["doctorReports"]):
        return {"success": False, "message": "Doctor report not found."}

    removed = target["doctorReports"].pop(index)
    save_patients(patients)
    return {"success": True, "message": "Doctor report deleted.", "deletedReport": removed}


# 9. Admin database reset endpoint
@router.post("/admin/reset")
def reset_database():
    success = reset_to_initial_patients()
    if success:
        return {"success": True, "message": "Patient database successfully reset to default records."}
    return {"success": False, "message": "Initial records unavailable to restore."}
