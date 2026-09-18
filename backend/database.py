"""
HELP INDIA – National Medical Disease History Portal
Database Access Layer (Thread-Safe JSON file persistence)
"""
import json
import os
import threading
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PATIENTS_FILE = os.path.join(DATA_DIR, "patients.json")
DOCTORS_FILE = os.path.join(DATA_DIR, "doctors.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

_db_lock = threading.Lock()
_initial_default_patients: Optional[List[Dict[str, Any]]] = None


def get_patients() -> List[Dict[str, Any]]:
    global _initial_default_patients
    with _db_lock:
        if not os.path.exists(PATIENTS_FILE):
            return []
        try:
            with open(PATIENTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if _initial_default_patients is None and isinstance(data, list) and len(data) > 0:
                    _initial_default_patients = json.loads(json.dumps(data))
                return data
        except Exception as e:
            print(f"Error loading patients.json: {e}")
            return json.loads(json.dumps(_initial_default_patients)) if _initial_default_patients else []


def save_patients(data: List[Dict[str, Any]]) -> None:
    with _db_lock:
        with open(PATIENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def get_doctors() -> List[Dict[str, Any]]:
    with _db_lock:
        if not os.path.exists(DOCTORS_FILE):
            return [
                {
                    "id": "DOC1001",
                    "name": "Dr. Raj Sharma",
                    "password": "doctor123",
                    "specialization": "General Physician",
                    "hospital": "All India Institute of Medical Sciences (AIIMS)",
                    "registrationNumber": "MCI-2015-84920",
                    "registeredOn": "2026-01-10"
                }
            ]
        try:
            with open(DOCTORS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading doctors.json: {e}")
            return []


def save_doctors(data: List[Dict[str, Any]]) -> None:
    with _db_lock:
        with open(DOCTORS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def reset_to_initial_patients() -> bool:
    global _initial_default_patients
    if _initial_default_patients:
        save_patients(_initial_default_patients)
        return True
    return False
