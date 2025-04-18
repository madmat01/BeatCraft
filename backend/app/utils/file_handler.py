from fastapi import UploadFile, HTTPException
from typing import List
import magic

ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',      # MP3
    'audio/wav',       # WAV
    'audio/x-wav',     # WAV alternative mime type
    'audio/vnd.wave',  # Another WAV alternative
    'audio/wave',      # Another WAV alternative
    'audio/aiff',      # AIFF
    'audio/x-aiff'     # AIFF alternative mime type
]

async def validate_audio_file(file: UploadFile) -> bytes:
    """
    Validate and read an uploaded audio file
    
    Args:
        file: The uploaded file to validate
        
    Returns:
        bytes: The contents of the file if valid
        
    Raises:
        HTTPException: If the file is invalid or too large
    """
    # Check file size (limit to 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size allowed is 50MB"
        )
    
    # Check file type using python-magic
    file_type = magic.from_buffer(contents, mime=True)
    if file_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Invalid file type. Must be one of: {', '.join(ALLOWED_AUDIO_TYPES)}"
        )
    
    return contents
