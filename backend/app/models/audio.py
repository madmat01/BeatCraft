from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class DrumPatternType(str, Enum):
    BASIC = "basic"
    HIHAT = "hihat"
    FULL = "full"

class AudioAnalysisResponse(BaseModel):
    """Response model for audio analysis"""
    tempo: float
    beat_times: List[float]
    swing_ratio: float

class MidiGenerationOptions(BaseModel):
    pattern_type: DrumPatternType = Field(default=DrumPatternType.BASIC)
    apply_swing: bool = Field(default=True)
    velocity: int = Field(default=100, ge=0, le=127)

class AudioAnalysisRequest(BaseModel):
    midi_options: Optional[MidiGenerationOptions] = None

class AudioAnalysisError(BaseModel):
    """Error response model"""
    detail: str
