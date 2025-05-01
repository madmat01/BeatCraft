from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
import tempfile
import os
import logging
from typing import Optional
import pretty_midi
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
import numpy as np

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/analyze")
async def analyze_audio(
    file: UploadFile = File(...),
    num_bars: Optional[int] = Form(4)
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
        logger.info(f"Analyzing audio file: {file.filename}")
        
        # Get file content
        content = await file.read()
        
        # Validate file size (50MB limit)
        if len(content) > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB"
            )
        
        # Validate file type
        if not file.filename.lower().endswith(('.wav', '.mp3')):
            raise HTTPException(
                status_code=415,
                detail="Only WAV and MP3 files are supported"
            )
        
        if len(content) == 0:
            raise HTTPException(
                status_code=415,
                detail="Empty file"
            )
        
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
            logger.info(f"Audio file saved to: {temp_file_path}")
        
        # Import inside function to avoid circular imports
        from ..core.audio_analyzer import AudioAnalyzer
        audio_analyzer = AudioAnalyzer()
        
        # Set a timeout for the analysis
        timeout_seconds = 30
        
        # Analyze audio with timeout
        try:
            # Start the analysis tasks
            tempo_task = asyncio.create_task(audio_analyzer.analyze_tempo(content))
            
            # Wait for the tempo analysis with timeout
            try:
                tempo, beat_times = await asyncio.wait_for(tempo_task, timeout=timeout_seconds)
                # Ensure all values are Python native types, not numpy types
                tempo = float(tempo)
                beat_times = [float(t) for t in beat_times]
            except asyncio.TimeoutError:
                logger.error(f"Audio analysis timed out after {timeout_seconds} seconds")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Audio analysis timed out after {timeout_seconds} seconds. Try using a shorter audio file."
                )
            
            # Calculate swing ratio
            swing_ratio = await audio_analyzer.analyze_swing(beat_times)
            # Ensure value is a Python native type
            swing_ratio = float(swing_ratio)
            
            logger.info(f"Audio analysis complete: tempo={tempo}, swing_ratio={swing_ratio}")
            
            # Generate MIDI pattern
            # We'll use a simpler MIDI pattern generation for now
            midi_path = temp_file_path.replace(os.path.splitext(temp_file_path)[1], ".mid")
            
            # Create a basic MIDI file with the detected tempo
            midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)
            
            # Create a drum instrument
            drum_program = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
            
            # Add some basic drum hits based on beat times
            for i, beat_time in enumerate(beat_times[:num_bars*4]):  # Limit to requested number of bars
                # Ensure beat_time is a float
                beat_time = float(beat_time)
                
                # Add kick drum on beats 0, 4, 8, etc.
                if i % 4 == 0:
                    kick = pretty_midi.Note(velocity=100, pitch=36, start=beat_time, end=beat_time + 0.1)
                    drum_program.notes.append(kick)
                
                # Add snare on beats 2, 6, 10, etc.
                if i % 4 == 2:
                    snare = pretty_midi.Note(velocity=100, pitch=38, start=beat_time, end=beat_time + 0.1)
                    drum_program.notes.append(snare)
                
                # Add hi-hat on every beat
                hat = pretty_midi.Note(velocity=80, pitch=42, start=beat_time, end=beat_time + 0.1)
                drum_program.notes.append(hat)
            
            # Extract pattern data for the frontend
            pattern_data = []
            # Map MIDI notes to drum types (0: kick, 1: snare, 2: hihat, 3: clap)
            drum_note_map = {
                36: 0,  # Kick drum
                38: 1,  # Snare drum
                42: 2,  # Hi-hat
                39: 3,  # Clap/Handclap
            }
            
            # Calculate time divisions based on tempo
            beat_duration = 60 / tempo  # Duration of one beat in seconds
            sixteenth_duration = beat_duration / 4  # Duration of a 16th note
            
            # Initialize empty pattern (4 drum types x 16 steps)
            pattern = [[False for _ in range(16)] for _ in range(4)]
            
            # Fill in the pattern based on note timings
            for note in drum_program.notes:
                if note.pitch in drum_note_map:
                    drum_index = drum_note_map[note.pitch]
                    # Calculate which step this note falls on (quantize to 16th notes)
                    step_index = round(note.start / sixteenth_duration) % 16
                    if 0 <= step_index < 16:
                        pattern[drum_index][step_index] = True
            
            # Add the drum instrument to the MIDI file
            midi.instruments.append(drum_program)
            
            # Write the MIDI file
            midi.write(midi_path)
            logger.info(f"MIDI file saved to: {midi_path}")
            
            # Clean up temporary audio file
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Could not remove temporary file {temp_file_path}: {str(e)}")
            
            return {
                "tempo": tempo,
                "swing_ratio": swing_ratio,
                "midi_path": midi_path,
                "pattern": pattern
            }
            
        except ValueError as ve:
            error_msg = str(ve)
            logger.error(f"ValueError in audio analysis: {error_msg}")
            
            if "ffmpeg" in error_msg.lower():
                raise HTTPException(
                    status_code=400, 
                    detail="MP3 files require ffmpeg which is not installed. Please upload a WAV file instead."
                )
            elif "timeout" in error_msg.lower():
                raise HTTPException(
                    status_code=408, 
                    detail="Audio analysis took too long. Try using a shorter audio file."
                )
            else:
                raise HTTPException(status_code=500, detail=f"Error analyzing audio: {error_msg}")
        except Exception as e:
            logger.error(f"Error analyzing audio: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error analyzing audio: {str(e)}")
            
    except HTTPException:
        # Re-raise HTTP exceptions to preserve status code and detail
        raise
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Ensure temp file is cleaned up in case of error
        try:
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        except:
            pass

@router.get("/download/{midi_path:path}")
async def download_midi(midi_path: str):
    """
    Download a generated MIDI file.
    
    Args:
        midi_path: Path to the MIDI file
        
    Returns:
        FileResponse with the MIDI file
    """
    if not os.path.exists(midi_path):
        raise HTTPException(status_code=404, detail="MIDI file not found")
    
    return FileResponse(
        midi_path,
        filename="drum_pattern.mid",
        media_type="audio/midi"
    ) 