import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.audio_analyzer import AudioAnalyzer
import numpy as np
import io
import librosa

client = TestClient(app)

def create_test_audio(duration=5, sr=22050, bpm=120):
    """Create a test audio signal with a click track at specified BPM"""
    # Create time array
    t = np.linspace(0, duration, int(sr * duration))
    
    # Create click track
    beat_period = 60.0 / bpm  # seconds per beat
    clicks = np.zeros_like(t)
    
    # Add clicks at beat positions
    for beat in np.arange(0, duration, beat_period):
        idx = int(beat * sr)
        if idx < len(clicks):
            clicks[idx:idx+100] = 1.0  # 100 samples click duration
    
    return clicks, sr

def test_tempo_detection():
    """Test tempo detection on a synthetic audio signal"""
    # Create test audio with known tempo
    test_bpm = 120
    y, sr = create_test_audio(bpm=test_bpm)
    
    # Convert to WAV bytes
    import scipy.io.wavfile as wav
    import io
    
    buffer = io.BytesIO()
    wav.write(buffer, sr, y.astype(np.float32))
    audio_bytes = buffer.getvalue()
    
    # Test the analyzer
    analyzer = AudioAnalyzer()
    tempo, beat_times = pytest.mark.asyncio(analyzer.analyze_tempo(audio_bytes))
    
    # Allow for some deviation in tempo detection
    assert abs(tempo - test_bpm) < 5.0

def test_swing_detection():
    """Test swing detection"""
    # Test with straight timing
    straight_beats = [0.0, 0.5, 1.0, 1.5, 2.0]
    analyzer = AudioAnalyzer()
    swing_ratio = pytest.mark.asyncio(analyzer.analyze_swing(straight_beats))
    assert abs(swing_ratio - 0.5) < 0.1
    
    # Test with swung timing
    swung_beats = [0.0, 0.67, 1.0, 1.67, 2.0]
    swing_ratio = pytest.mark.asyncio(analyzer.analyze_swing(swung_beats))
    assert swing_ratio > 0.6

def test_api_endpoint_validation():
    """Test API endpoint file validation"""
    # Test with empty file
    response = client.post("/audio/analyze", files={"file": ("test.wav", b"")})
    assert response.status_code == 415
    
    # Test with oversized file
    large_file = b"0" * (51 * 1024 * 1024)  # 51MB
    response = client.post("/audio/analyze", files={"file": ("test.wav", large_file)})
    assert response.status_code == 413
