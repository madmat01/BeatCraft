import pytest
import asyncio
import librosa
from app.core.audio_analyzer import AudioAnalyzer
import numpy as np
import os

# Test file paths
TEST_FILES = {
    90: "tests/test_audio/drum_loop_90bpm.wav",
    120: "tests/test_audio/drum_loop_120bpm.wav",
    140: "tests/test_audio/drum_loop_140bpm.wav"
}

@pytest.mark.asyncio
async def test_tempo_detection_real_audio(event_loop):
    """Test tempo detection on real drum loops"""
    analyzer = AudioAnalyzer()
    
    for expected_bpm, file_path in TEST_FILES.items():
        with open(file_path, 'rb') as f:
            audio_bytes = f.read()
        
        tempo, beat_times = await analyzer.analyze_tempo(audio_bytes)
        
        # Allow for 5% deviation in tempo detection
        max_deviation = expected_bpm * 0.05
        assert abs(tempo - expected_bpm) < max_deviation, f"Failed to detect correct tempo for {file_path}. Got {tempo}, expected {expected_bpm}"
        
        # Check that we have a reasonable number of beat times
        duration = librosa.get_duration(path=file_path)
        expected_beats = (duration * expected_bpm) / 60  # duration * beats per second
        min_beats = max(2, expected_beats * 0.4)  # At least 2 beats, or 40% of expected
        max_beats = expected_beats * 2.0  # Allow up to double the expected beats
        
        assert len(beat_times) >= min_beats, f"Too few beats detected in {file_path}. Got {len(beat_times)}, expected at least {min_beats}"
        assert len(beat_times) <= max_beats, f"Too many beats detected in {file_path}. Got {len(beat_times)}, expected at most {max_beats}"

@pytest.mark.asyncio
async def test_swing_detection_real_audio(event_loop):
    """Test swing detection on real drum loops"""
    analyzer = AudioAnalyzer()
    
    # Our test files are straight (not swung), so they should have swing ratios close to 0.5
    for _, file_path in TEST_FILES.items():
        with open(file_path, 'rb') as f:
            audio_bytes = f.read()
        
        _, beat_times = await analyzer.analyze_tempo(audio_bytes)
        swing_ratio = await analyzer.analyze_swing(beat_times)
        
        # For straight timing, expect swing ratio close to 0.5
        assert abs(swing_ratio - 0.5) < 0.1, f"Incorrect swing detection for {file_path}"

@pytest.mark.asyncio
async def test_api_endpoint_with_real_audio(event_loop, test_client):
    """Test the API endpoint with real audio files"""
    test_file = TEST_FILES[120]  # Use 120 BPM file
    
    with open(test_file, 'rb') as f:
        response = test_client.post(
            "/audio/analyze",
            files={"file": ("test.wav", f)}
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # Check response structure
    assert "tempo" in data
    assert "beat_times" in data
    assert "swing_ratio" in data
    
    # Check value ranges
    assert 110 < data["tempo"] < 130  # Expected around 120 BPM
    assert len(data["beat_times"]) > 0
    assert 0.4 < data["swing_ratio"] < 0.6  # Expected straight timing

def test_api_endpoint_validation(test_client):
    """Test API endpoint file validation"""
    # Test with empty file
    response = test_client.post("/audio/analyze", files={"file": ("test.wav", b"")})
    assert response.status_code == 415
    
    # Test with oversized file
    large_file = b"0" * (51 * 1024 * 1024)  # 51MB
    response = test_client.post("/audio/analyze", files={"file": ("test.wav", large_file)})
    assert response.status_code == 413
    
    # Test with invalid file type
    response = test_client.post("/audio/analyze", files={"file": ("test.txt", b"not an audio file")})
    assert response.status_code == 415

def test_error_handling(test_client):
    """Test error handling in the API"""
    # Test with corrupted audio file
    response = test_client.post("/audio/analyze", files={"file": ("test.wav", b"corrupted audio data")})
    assert response.status_code == 415  # Should be unsupported media type
    assert "Invalid file type" in response.json()["detail"]
    
    # Test with valid file type but invalid audio data
    with open(TEST_FILES[120], 'rb') as f:
        data = f.read()
        corrupted_data = data[:100] + b'corrupted' + data[107:]  # Corrupt some bytes in the middle
        response = test_client.post("/audio/analyze", files={"file": ("test.wav", corrupted_data)})
        assert response.status_code == 500
        assert "Error analyzing audio" in response.json()["detail"]
