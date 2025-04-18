from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class PatternType(str, Enum):
    """Enum for MIDI drum pattern types"""
    BASIC = "basic"
    HIHAT = "hihat"
    FULL = "full"

class AudioAnalysisResponse(BaseModel):
    """Response model for audio analysis"""
    tempo: float
    beat_times: List[float]
    swing_ratio: float

class MidiGenerationOptions(BaseModel):
    """Options for MIDI generation"""
    pattern_type: PatternType = Field(default=PatternType.BASIC, description="Type of drum pattern to generate")
    velocity: int = Field(default=100, ge=1, le=127, description="MIDI velocity (1-127)")
    apply_swing: bool = Field(default=True, description="Whether to apply swing to the pattern")

class AudioAnalysisError(BaseModel):
    """Error response model"""
    detail: str
