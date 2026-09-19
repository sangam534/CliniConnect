"""
AI Disease & Condition Assistant using NVIDIA DeepSeek API Client
Supports:
1. Summarize: Concise clinical summary of the patient's reported disease/conditions.
2. Advice: Supportive care, questions for the doctor, and red flag warnings.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
try:
    from dotenv import load_dotenv
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_file):
        load_dotenv(env_file)
except ImportError:
    pass

from openai import OpenAI
from database import get_patients

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Base URL, API Key, and Model configured with env fallbacks
BASE_URL = os.getenv("OPENAI_BASE_URL", "https://integrate.api.nvidia.com/v1")
API_KEY = os.getenv("OPENAI_API_KEY", "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")
MODEL_NAME = os.getenv("OPENAI_MODEL", "deepseek-ai/deepseek-v4-flash-0731")

client = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY,
    timeout=180.0
)


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


def call_nvidia_ai(prompt: str, system_message: str):
    """
    Calls NVIDIA NIM DeepSeek API with streaming chunk aggregation
    as specified in deepseek_api reference file.
    Captures both thinking/reasoning and final clinical content.
    """
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=1,
            top_p=0.95,
            max_tokens=16384,
            extra_body={"chat_template_kwargs": {"thinking": True, "reasoning_effort": "high"}},
            stream=True
        )

        reasoning_chunks = []
        content_chunks = []

        for chunk in completion:
            if not getattr(chunk, "choices", None):
                continue
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue

            reasoning = getattr(delta, "reasoning", None) or getattr(delta, "reasoning_content", None)
            if reasoning:
                reasoning_chunks.append(reasoning)

            if delta.content is not None:
                content_chunks.append(delta.content)

        reasoning_text = "".join(reasoning_chunks).strip()
        content_text = "".join(content_chunks).strip()

        final_text = content_text if content_text else reasoning_text
        if not final_text:
            final_text = "Analysis completed. Please consult with your healthcare provider."

        return final_text, reasoning_text
    except Exception as e:
        print(f"Error calling DeepSeek AI: {e}")
        fallback_msg = (
            f"Clinical Summary / Guidance: Based on reported input ('{prompt[:100]}...'), "
            f"medical evaluation by a licensed physician is recommended for proper diagnosis."
        )
        return fallback_msg, ""


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

    result_text, reasoning_text = call_nvidia_ai(user_prompt, system_prompt)

    return {
        "success": True,
        "action": action,
        "model": MODEL_NAME,
        "result": result_text,
        "reasoning": reasoning_text
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
