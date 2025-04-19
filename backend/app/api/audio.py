from fastapi import APIRouter, UploadFile, HTTPException, Form, File, Depends
from fastapi.responses import FileResponse
from app.core.audio_analyzer import AudioAnalyzer
from app.core.midi_generator import MidiGenerator
from app.utils.file_handler import validate_audio_file
from app.models.audio import AudioAnalysisResponse, AudioAnalysisError, MidiGenerationOptions, PatternType
import tempfile
import os
import logging

# Set up logging
logger = logging.getLogger(__name__)

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
async def analyze_audio(file: UploadFile):
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
        logger.error(f"Error analyzing audio: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing audio: {str(e)}"
        )

@router.post("/analyze/midi")
async def generate_midi(
    file: UploadFile,
    options: MidiGenerationOptions = Depends()
):
    """
    Generate a MIDI file from an audio analysis.
    """
    try:
        # Validate and read the file
        contents = await validate_audio_file(file)
        
        # Analyze tempo and beat frames
        analyzer = AudioAnalyzer()
        tempo, beat_times = await analyzer.analyze_tempo(contents)
        
        # Generate MIDI file
        with tempfile.TemporaryDirectory() as temp_dir:
            midi_path = os.path.join(temp_dir, "drum_pattern.mid")
            
            # Create MIDI generator
            midi_generator = MidiGenerator()
            
            # Generate MIDI file
            midi_generator.generate_midi_file(
                beat_times=beat_times,
                tempo=tempo,
                output_path=midi_path,
                pattern_type=options.pattern_type,
                velocity=options.velocity,
                swing_ratio=options.swing_ratio if options.swing_ratio is not None else 0.5
            )
            
            # Return the file as a response
            return FileResponse(
                midi_path,
                filename="drum_pattern.mid",
                media_type="audio/midi"
            )
            
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error generating MIDI: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating MIDI: {str(e)}"
        )
