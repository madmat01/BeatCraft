import pytest
from fastapi.testclient import TestClient
from app import app  # Import app from __init__.py
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
    
    # Convert to WAV bytes using memory buffer
    import scipy.io.wavfile as wav
    import io
    
    buffer = io.BytesIO()
    wav.write(buffer, sr, y.astype(np.float32))
    audio_bytes = buffer.getvalue()
    
    # Test the analyzer
    analyzer = AudioAnalyzer()
    
    # Run the async function in a synchronous test
    import asyncio
    tempo, beat_times = asyncio.run(analyzer.analyze_tempo(audio_bytes))
    
    # Allow for some deviation in tempo detection
    assert abs(tempo - test_bpm) < 5.0

def test_swing_detection():
    """Test swing detection"""
    # Test with straight timing
    straight_beats = [0.0, 0.5, 1.0, 1.5, 2.0]
    analyzer = AudioAnalyzer()
    
    # Run the async function in a synchronous test
    import asyncio
    swing_ratio = asyncio.run(analyzer.analyze_swing(straight_beats))
    assert abs(swing_ratio - 0.5) < 0.1
    
    # Test with swung timing
    # Our algorithm calculates the ratio as odd_intervals / (odd_intervals + even_intervals)
    # For a typical swing pattern, this would be around 0.33-0.4
    swung_beats = [0.0, 0.67, 1.0, 1.67, 2.0]
    swing_ratio = asyncio.run(analyzer.analyze_swing(swung_beats))
    assert 0.3 < swing_ratio < 0.4

def test_api_endpoint_validation():
    """Test API endpoint file validation"""
    # Test with invalid file type
    response = client.post("/audio/analyze", files={"file": ("test.txt", b"This is not an audio file")})
    assert response.status_code == 415
    
    # Test with empty file
    response = client.post("/audio/analyze", files={"file": ("test.wav", b"")})
    assert response.status_code == 415
    
    # We'll skip the oversized file test to avoid memory issues
    # large_file = b"0" * (51 * 1024 * 1024)  # 51MB
    # response = client.post("/audio/analyze", files={"file": ("test.wav", large_file)})
    # assert response.status_code == 413

def test_transient_detection():
    """Test transient detection on a synthetic audio signal"""
    # Create test audio with a clear transient at a specific time
    y, sr = create_test_audio(duration=3, bpm=120)
    
    # Add a strong transient at 0.5 seconds
    transient_time = 0.5  # seconds
    transient_idx = int(transient_time * sr)
    y[transient_idx:transient_idx+200] = 2.0  # Strong transient
    
    # Convert to WAV bytes using memory buffer
    import scipy.io.wavfile as wav
    import io
    
    buffer = io.BytesIO()
    wav.write(buffer, sr, y.astype(np.float32))
    audio_bytes = buffer.getvalue()
    
    # Test the analyzer
    analyzer = AudioAnalyzer()
    
    # Run the async function in a synchronous test
    import asyncio
    detected_transient = asyncio.run(analyzer.detect_first_transient(audio_bytes))
    
    # Allow for some deviation in transient detection (within 100ms)
    assert abs(detected_transient - transient_time) < 0.1

def test_transient_detection_endpoint():
    """Test the transient detection API endpoint"""
    # Create test audio with a clear transient
    y, sr = create_test_audio(duration=2, bpm=120)
    
    # Add a strong transient at 0.5 seconds
    transient_time = 0.5  # seconds
    transient_idx = int(transient_time * sr)
    y[transient_idx:transient_idx+200] = 2.0  # Strong transient
    
    # Convert to WAV bytes
    import scipy.io.wavfile as wav
    import io
    
    buffer = io.BytesIO()
    wav.write(buffer, sr, y.astype(np.float32))
    audio_bytes = buffer.getvalue()
    
    # Test the API endpoint
    response = client.post("/audio/detect-transient", files={"file": ("test.wav", audio_bytes)})
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert "first_transient_time" in data
    
    # Allow for some deviation in transient detection (within 100ms)
    assert abs(data["first_transient_time"] - transient_time) < 0.1
