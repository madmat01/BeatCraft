from fastapi import APIRouter, UploadFile, HTTPException, Depends, Response
from app.core.audio_analyzer import AudioAnalyzer
from app.core.midi_generator import MidiGenerator
from app.utils.file_handler import validate_audio_file
from app.models.audio import (
    AudioAnalysisResponse,
    AudioAnalysisError,
    AudioAnalysisRequest,
    MidiGenerationOptions
)
import io

router = APIRouter(
    prefix="/audio",
    tags=["audio"],
    responses={
        404: {"model": AudioAnalysisError, "description": "Not found"},
        413: {"model": AudioAnalysisError, "description": "File too large"},
        415: {"model": AudioAnalysisError, "description": "Unsupported file type"},
        500: {"model": AudioAnalysisError, "description": "Internal server error"}
    },
)

@router.post("/analyze", response_model=AudioAnalysisResponse)
async def analyze_audio(
    file: UploadFile,
    options: AudioAnalysisRequest = Depends()
):
    """
    Analyze uploaded audio file to extract tempo, beat information, and swing ratio.
    Returns tempo (BPM), beat times, and estimated swing ratio.
    """
    try:
        # Validate and read the file
        contents = await validate_audio_file(file)
        
        # Analyze tempo and beat frames
        analyzer = AudioAnalyzer()
        tempo, beat_times = await analyzer.analyze_tempo(contents)
        
        # Analyze swing ratio
        swing_ratio = await analyzer.analyze_swing(beat_times)
        
        return AudioAnalysisResponse(
            tempo=tempo,
            beat_times=beat_times,
            swing_ratio=swing_ratio
        )
        
    except HTTPException as e:
        # Re-raise HTTP exceptions as they're already properly formatted
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing audio: {str(e)}"
        )

@router.post("/analyze/midi")
async def analyze_and_generate_midi(
    file: UploadFile,
    pattern_type: str = "basic",
    apply_swing: bool = True,
    velocity: int = 100
):
    """
    Analyze audio and generate a matching MIDI drum pattern.
    Returns the MIDI file as a download.
    """
    try:
        # First analyze the audio
        contents = await validate_audio_file(file)
        analyzer = AudioAnalyzer()
        tempo, beat_times = await analyzer.analyze_tempo(contents)
        swing_ratio = await analyzer.analyze_swing(beat_times)
        
        # Generate MIDI
        midi = MidiGenerator.create_drum_pattern(
            beat_times=beat_times,
            tempo=tempo,
            pattern_type=pattern_type,
            velocity=velocity
        )
        
        # Apply swing if requested
        if apply_swing and abs(swing_ratio - 0.5) > 0.05:
            midi = MidiGenerator.add_swing(midi, swing_ratio)
        
        # Convert MIDI to bytes
        midi_file = io.BytesIO()
        midi.write(midi_file)
        midi_data = midi_file.getvalue()
        
        # Create the response with the MIDI file
        return Response(
            content=midi_data,
            media_type="audio/midi",
            headers={
                "Content-Disposition": f"attachment; filename=drum_pattern_{int(tempo)}bpm.mid"
            }
        )
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating MIDI: {str(e)}"
        )
