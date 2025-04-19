from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import tempfile
import os
from typing import Optional
from ..core.audio_analysis import AudioAnalyzer

router = APIRouter()
audio_analyzer = AudioAnalyzer()

@router.post("/analyze")
async def analyze_audio(
    file: UploadFile = File(...),
    num_bars: Optional[int] = 4
):
    """
    Analyze uploaded audio file and generate a MIDI drum pattern.
    
    Args:
        file: Audio file to analyze
        num_bars: Number of bars to generate in the MIDI pattern
        
    Returns:
        Dictionary containing analysis results and MIDI file path
    """
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Analyze audio
        tempo, swing_ratio, beat_frames = audio_analyzer.analyze_audio(temp_file_path)
        
        # Generate MIDI pattern
        midi_data = audio_analyzer.generate_midi_pattern(
            tempo=tempo,
            swing_ratio=swing_ratio,
            num_bars=num_bars
        )
        
        # Save MIDI file
        midi_path = temp_file_path.replace(".wav", ".mid")
        midi_data.write(midi_path)
        
        # Clean up temporary audio file
        os.unlink(temp_file_path)
        
        return {
            "tempo": tempo,
            "swing_ratio": swing_ratio,
            "midi_path": midi_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{midi_path:path}")
async def download_midi(midi_path: str):
    """
    Download the generated MIDI file.
    
    Args:
        midi_path: Path to the MIDI file
        
    Returns:
        MIDI file as a download
    """
    if not os.path.exists(midi_path):
        raise HTTPException(status_code=404, detail="MIDI file not found")
    
    return FileResponse(
        midi_path,
        media_type="audio/midi",
        filename="drum_pattern.mid"
    ) 