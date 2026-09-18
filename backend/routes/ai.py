"""
AI Disease & Condition Assistant using NVIDIA OpenAI NIM Client
Supports:
1. Summarize: Concise clinical summary of the patient's reported disease/conditions.
2. Advice: Supportive care, questions for the doctor, and red flag warnings.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from database import get_patients

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Initialize client exactly as requested
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key="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",
    timeout=35.0
)
MODEL_NAME = "openai/gpt-oss-20b"


class ConditionAnalysisRequest(BaseModel):
    condition: str
    action: str = "summarize"  # "summarize" or "advice"
    patientId: Optional[str] = None
    useHistory: Optional[bool] = False


class LegacySymptomRequest(BaseModel):
    symptoms: str
    patientId: Optional[str] = None
    useHistory: Optional[bool] = False


def build_patient_history_context(patient_id: Optional[str]) -> str:
    if not patient_id:
        return ""
    patients = get_patients()
    patient = next((p for p in patients if p.get("patientId", "").strip().upper() == patient_id.strip().upper()), None)
    if not patient:
        return ""

    major = patient.get("majorDiseases", "None")
    diseases = [d.get("diseaseName") for d in patient.get("diseases", []) if d.get("diseaseName")]
    recent = ", ".join(diseases[:5]) if diseases else "None"
    return f"Patient Major Diagnoses: {major}. Recorded Medical History: {recent}."


def call_nvidia_ai(prompt: str, system_message: str) -> str:
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1024,
            stream=True
        )
        content_parts = []
        for chunk in completion:
            if not getattr(chunk, "choices", None):
                continue
            delta = chunk.choices[0].delta
            if delta and getattr(delta, "content", None):
                content_parts.append(delta.content)
        
        result_text = "".join(content_parts).strip()
        if result_text:
            return result_text
        return "Analysis completed. Please consult with your healthcare provider."
    except Exception as e:
        print(f"Error calling NVIDIA AI: {e}")
        return f"Clinical Summary / Guidance: Based on reported input ('{prompt[:100]}...'), medical evaluation by a licensed physician is recommended for proper diagnosis."


@router.post("/condition-assistant")
def condition_assistant(req: ConditionAnalysisRequest):
    condition_text = req.condition.strip()
    if not condition_text:
        return {"success": False, "message": "Please enter your disease symptoms or medical conditions."}

    history_context = ""
    if req.useHistory and req.patientId:
        history_context = build_patient_history_context(req.patientId)

    action = req.action.lower().strip()

    if action == "summarize":
        system_prompt = (
            "You are an expert clinical summarizer for the HELP INDIA Healthcare Portal. "
            "Your task is to take the patient's reported diseases, symptoms, and conditions, "
            "along with any provided medical history, and provide a clear, empathetic, well-structured summary. "
            "Organize your summary into:\n"
            "1. Primary Concerns & Overview\n"
            "2. Associated Symptoms & Patterns\n"
            "3. Key Clinical Considerations for Your Doctor\n"
            "Keep the language plain, clear, and reassuring."
        )
        user_prompt = f"Patient Input: \"{condition_text}\"\n"
        if history_context:
            user_prompt += f"Verified Patient Record: {history_context}\n"
        user_prompt += "Please provide a clinical summary of these conditions."

    else:  # "advice"
        system_prompt = (
            "You are a compassionate healthcare guidance assistant for the HELP INDIA Healthcare Portal. "
            "Your task is to provide supportive, evidence-based guidance for the patient's conditions. "
            "Organize your guidance into:\n"
            "1. Immediate Self-Care & Supportive Measures (e.g. hydration, rest, gentle foods)\n"
            "2. What to Discuss With Your Doctor (key questions to ask)\n"
            "3. ⚠️ Red Flags / Warning Signs (symptoms that require urgent emergency hospital care)\n"
            "DO NOT prescribe scheduled or prescription-only medications. Include a medical disclaimer."
        )
        user_prompt = f"Patient Input: \"{condition_text}\"\n"
        if history_context:
            user_prompt += f"Verified Patient Record: {history_context}\n"
        user_prompt += "Please provide clinical guidance, self-care measures, and warning signs."

    result_text = call_nvidia_ai(user_prompt, system_prompt)

    return {
        "success": True,
        "action": action,
        "model": MODEL_NAME,
        "result": result_text
    }


# Backwards compatibility endpoint for existing symptom calls
@router.post("/analyze-symptoms")
def analyze_symptoms_compat(req: LegacySymptomRequest):
    return condition_assistant(ConditionAnalysisRequest(
        condition=req.symptoms,
        action="advice",
        patientId=req.patientId,
        useHistory=req.useHistory
    ))
