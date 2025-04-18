from fastapi import APIRouter, UploadFile, HTTPException
from app.core.audio_analyzer import AudioAnalyzer
from app.utils.file_handler import validate_audio_file
from app.models.audio import AudioAnalysisResponse, AudioAnalysisError

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
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing audio: {str(e)}"
        )
