import librosa
import numpy as np
from typing import Tuple, List, Union
import tempfile
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import time

# Set up logging
logger = logging.getLogger(__name__)

class AudioAnalyzer:
    """Core business logic for audio analysis"""
    
    @staticmethod
    async def _load_audio(audio_data: bytes, max_duration_seconds: int = 30) -> Tuple[np.ndarray, int]:
        """
        Load audio data and optionally trim it to the specified maximum duration
        
        Args:
            audio_data: Raw bytes of audio file
            max_duration_seconds: Maximum duration to analyze (to improve performance)
            
        Returns:
            Tuple containing:
            - y: Audio time series
            - sr: Sampling rate
        """
        def _load_in_thread():
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            try:
                # Try to load as WAV
                start_time = time.time()
                y, sr = librosa.load(temp_path, sr=None, duration=max_duration_seconds)
                logger.info(f"Audio loaded in {time.time() - start_time:.2f} seconds. Length: {len(y) / sr:.2f}s, Sample rate: {sr}Hz")
                
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass
                    
                return y, sr
            except Exception as wav_error:
                logger.warning(f"Failed to load as WAV: {str(wav_error)}. Trying to use MP3 loading...")
                try:
                    # Try to use pydub to convert MP3 to WAV if librosa couldn't load directly
                    try:
                        import pydub
                        from pydub import AudioSegment
                    except ImportError:
                        logger.error("pydub not installed. Please install with: pip install pydub")
                        raise ImportError("pydub not installed. Please install with: pip install pydub")
                    
                    # Load MP3 file
                    try:
                        audio = AudioSegment.from_file(temp_path)
                        # Convert to WAV format
                        wav_path = temp_path + ".wav"
                        audio.export(wav_path, format="wav")
                        
                        # Now load with librosa
                        y, sr = librosa.load(wav_path, sr=None, duration=max_duration_seconds)
                        logger.info(f"MP3 audio loaded in {time.time() - start_time:.2f} seconds. Length: {len(y) / sr:.2f}s, Sample rate: {sr}Hz")
                        
                        # Clean up the temp WAV file
                        try:
                            os.unlink(wav_path)
                            os.unlink(temp_path)
                        except:
                            pass
                        return y, sr
                    except Exception as mp3_error:
                        logger.error(f"Failed to load MP3 with pydub: {str(mp3_error)}")
                        if "ffmpeg" in str(mp3_error).lower():
                            raise ValueError("Failed to process MP3: ffmpeg is not installed. Please use WAV format instead.")
                        raise ValueError(f"Failed to load audio file: {str(mp3_error)}")
                except Exception as e:
                    # Try to clean up before exiting
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
                        
                    logger.error(f"All audio loading methods failed: {str(e)}")
                    if "ffmpeg" in str(e).lower():
                        raise ValueError("Failed to process MP3: ffmpeg is not installed. Please use WAV format instead.")
                    raise ValueError(f"Failed to load audio file: {str(e)}")
        
        # Run the potentially long-running audio loading in a separate thread
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            return await loop.run_in_executor(executor, _load_in_thread)
    
    @staticmethod
    async def analyze_tempo(audio_data: bytes) -> Tuple[float, List[float]]:
        """
        Analyze tempo and beat frames from audio data
        
        Args:
            audio_data: Raw bytes of audio file
            
        Returns:
            Tuple containing:
            - tempo (float): Estimated tempo in BPM
            - beat_frames (List[float]): List of beat frame timings
        """
        try:
            # Load the audio file
            start_time = time.time()
            y, sr = await AudioAnalyzer._load_audio(audio_data, max_duration_seconds=30)
            
            # Run the heavy processing in a separate thread
            def _process_in_thread():
                # Estimate tempo and beat frames
                tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
                
                # Convert beat frames to timestamps
                beat_times = librosa.frames_to_time(beat_frames, sr=sr)
                
                # Convert numpy values to Python scalars to avoid rounding issues
                tempo_float = float(tempo)
                beat_times_list = [float(t) for t in beat_times]
                
                return tempo_float, beat_times_list
            
            # Run with a timeout
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(executor, _process_in_thread)
                
            logger.info(f"Tempo analysis completed in {time.time() - start_time:.2f} seconds")
            return result
        except Exception as e:
            logger.error(f"Error in analyze_tempo: {str(e)}")
            if "ffmpeg" in str(e).lower():
                raise ValueError("Failed to process audio: ffmpeg is not installed. Please use WAV format instead.")
            raise ValueError(f"Failed to analyze tempo: {str(e)}")
    
    @staticmethod
    async def analyze_swing(beat_times: List[float]) -> float:
        """
        Analyze swing ratio from beat timings
        
        Args:
            beat_times: List of beat timings in seconds
            
        Returns:
            float: Estimated swing ratio (0.5 = straight, ~0.67 = swung)
        """
        if len(beat_times) < 4:
            return 0.5  # Default to straight timing if not enough beats
            
        # Calculate inter-beat intervals
        ibis = np.diff(beat_times)
        
        # For swing analysis, we look at pairs of intervals
        even_ibis = ibis[::2]
        odd_ibis = ibis[1::2]
        
        if len(even_ibis) == 0 or len(odd_ibis) == 0:
            return 0.5
            
        # Calculate the ratio between even and odd intervals
        ratio = np.mean(odd_ibis) / (np.mean(even_ibis) + np.mean(odd_ibis))
        
        # Convert numpy value to Python float
        return float(ratio)
