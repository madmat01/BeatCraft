import pytest
from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

@pytest.mark.asyncio
async def test_analyze_and_generate_midi():
    """Test MIDI generation endpoint with a real audio file"""
    # Open test audio file
    test_file_path = os.path.join("tests", "test_audio", "drum_loop_90bpm.wav")
    with open(test_file_path, "rb") as f:
        files = {"file": ("test.wav", f, "audio/wav")}
        response = client.post("/audio/analyze/midi", files=files)
    
    # Check response
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/midi"
    assert response.headers["content-disposition"].startswith("attachment; filename=drum_pattern_")
    assert response.headers["content-disposition"].endswith(".mid")
    
    # Check that we got some MIDI data
    assert len(response.content) > 0

@pytest.mark.asyncio
async def test_analyze_and_generate_midi_with_options():
    """Test MIDI generation with custom options"""
    test_file_path = os.path.join("tests", "test_audio", "drum_loop_90bpm.wav")
    with open(test_file_path, "rb") as f:
        # Request with custom MIDI options
        files = {"file": ("test.wav", f, "audio/wav")}
        response = client.post(
            "/audio/analyze/midi",
            files=files,
            params={
                "pattern_type": "full",
                "apply_swing": "true",
                "velocity": "90"
            }
        )
    
    # Check response
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/midi"
    assert len(response.content) > 0  # Should get MIDI data
