from pydantic import BaseModel
from typing import List

class AudioAnalysisResponse(BaseModel):
    """Response model for audio analysis"""
    tempo: float
    beat_times: List[float]
    swing_ratio: float
    
class AudioAnalysisError(BaseModel):
    """Error response model"""
    detail: str
