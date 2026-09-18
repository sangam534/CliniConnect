"""
Medical document upload route (PDF, PNG, JPEG)
"""
import os
import time
import re
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

router = APIRouter(prefix="/api", tags=["upload"])

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


@router.post("/upload")
async def upload_document(
    document: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    target = document or file
    if not target or not target.filename:
        return {"success": False, "message": "No document file uploaded."}

    ext = os.path.splitext(target.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "success": False,
            "message": "Invalid file type. Only PDF, PNG, and JPEG documents are permitted."
        }

    # Safe filename with unique prefix
    safe_name = re.sub(r"[^a-zA-Z0-9.-]", "_", target.filename)
    unique_name = f"{int(time.time() * 1000)}-{safe_name}"
    save_path = os.path.join(UPLOADS_DIR, unique_name)

    content = await target.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        return {"success": False, "message": "File exceeds maximum 10MB size limit."}

    with open(save_path, "wb") as f:
        f.write(content)

    file_url = f"/uploads/{unique_name}"
    return {
        "success": True,
        "message": "File uploaded successfully.",
        "fileUrl": file_url,
        "fileName": target.filename,
        "storedName": unique_name,
        "mimeType": target.content_type,
        "sizeBytes": len(content),
        "file": {
            "url": file_url,
            "filename": unique_name,
            "originalName": target.filename,
            "mimeType": target.content_type,
            "size": len(content)
        }
    }
