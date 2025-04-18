import librosa
import numpy as np
from typing import Tuple, List
import tempfile
import os

class AudioAnalyzer:
    """Core business logic for audio analysis"""
    
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
        # Create a temporary file to store the audio data
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_data)
            temp_file.flush()
            
            try:
                # Load the audio file
                # Load the audio file with a higher sample rate for better accuracy
                y, sr = librosa.load(temp_file.name, sr=44100)
                
                if y is None or len(y) == 0:
                    raise ValueError("Failed to load audio data - empty signal")
                
                # Calculate onset envelope with adjusted parameters
                hop_length = 256  # Even smaller hop length for better precision
                # First get the onset strength envelope
                onset_env = librosa.onset.onset_strength(
                    y=y, 
                    sr=sr,
                    hop_length=hop_length,
                    aggregate=np.median  # More robust aggregation
                )
                
                # Then detect onset peaks with more precise parameters
                onset_frames = librosa.onset.onset_detect(
                    onset_envelope=onset_env,
                    sr=sr,
                    hop_length=hop_length,
                    pre_max=30,  # Increase onset detection window
                    post_max=30,
                    pre_avg=100,
                    post_avg=100,
                    delta=0.2,  # Lower threshold for onset detection
                    wait=30  # Minimum number of samples between onset detections
                )
                
                # Estimate tempo from onset strength
                tempo = librosa.beat.tempo(
                    onset_envelope=onset_env,
                    sr=sr,
                    hop_length=hop_length,
                    start_bpm=120  # Start with a reasonable default
                )[0]
                
                # Adjust tempo if needed
                if tempo < 70:
                    tempo *= 2
                elif tempo > 200:
                    tempo /= 2
                
                # Use dynamic programming beat tracker with the adjusted tempo
                beat_frames = librosa.beat.beat_track(
                    onset_envelope=onset_env,
                    sr=sr,
                    hop_length=hop_length,
                    start_bpm=tempo,
                    tightness=100,  # Make the beat tracking more precise
                    trim=False  # Don't trim silent sections
                )[1]
                
                # If we don't have enough beats, try using onset frames directly
                if len(beat_frames) < 4:
                    # Filter onsets to match the tempo
                    beat_duration = 60.0 / tempo  # seconds per beat
                    min_frames_between_beats = int((beat_duration * sr) / hop_length * 0.8)
                    
                    # Convert onset frames to beat frames
                    filtered_onsets = []
                    last_onset = -min_frames_between_beats
                    
                    for onset in onset_frames:
                        if onset - last_onset >= min_frames_between_beats:
                            filtered_onsets.append(onset)
                            last_onset = onset
                    
                    if len(filtered_onsets) >= 4:
                        beat_frames = np.array(filtered_onsets)
                
                if tempo <= 0:
                    raise ValueError(f"Invalid tempo detected: {tempo}")
                
                # Convert beat frames to timestamps
                beat_times = librosa.frames_to_time(beat_frames, sr=sr)
                
                if len(beat_times) == 0:
                    raise ValueError("No beat times detected")
                
                return tempo, beat_times.tolist()
            except Exception as e:
                raise ValueError(f"Error analyzing audio: {str(e)}")
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(temp_file.name)
                except Exception as e:
                    print(f"Warning: Failed to delete temporary file: {e}")
    
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
        
        return float(ratio)
