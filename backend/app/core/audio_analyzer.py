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
                y, sr = librosa.load(temp_file.name)
                
                # Estimate tempo and beat frames
                tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
                
                # Convert beat frames to timestamps
                beat_times = librosa.frames_to_time(beat_frames, sr=sr)
                
                return tempo, beat_times.tolist()
            finally:
                # Clean up the temporary file
                os.unlink(temp_file.name)
    
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
