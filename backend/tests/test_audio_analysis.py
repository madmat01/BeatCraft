import pytest
import numpy as np
from app.core.audio_analysis import AudioAnalyzer
import os
import asyncio
import soundfile as sf

@pytest.fixture
def audio_analyzer():
    return AudioAnalyzer()

def test_analyze_audio(audio_analyzer):
    # Create a simple test audio file with known tempo
    sample_rate = 22050
    duration = 2.0  # seconds
    tempo = 120.0  # BPM
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Generate a simple beat pattern
    beat_frequency = tempo / 60.0
    signal = np.sin(2 * np.pi * beat_frequency * t)
    
    # Save test audio file
    test_audio_path = "test_audio.wav"
    sf.write(test_audio_path, signal, sample_rate)
    
    try:
        # Analyze the audio
        detected_tempo, swing_ratio, beat_frames = audio_analyzer.analyze_audio(test_audio_path)
        
        # Check that the detected tempo is close to the actual tempo
        assert abs(detected_tempo - tempo) < 10.0, "Detected tempo is too far from actual tempo"
        
        # Check that we detected some beats
        assert len(beat_frames) > 0, "No beats detected"
        
        # Check that swing ratio is within valid range (0.5 = straight)
        assert 0.45 <= swing_ratio <= 0.55, "Swing ratio out of expected range"
        
    finally:
        # Clean up test file
        if os.path.exists(test_audio_path):
            os.remove(test_audio_path)

def test_generate_midi_pattern(audio_analyzer):
    # Test MIDI pattern generation with known parameters
    tempo = 120.0
    swing_ratio = 0.6
    num_bars = 2  # 2 bars
    
    # Generate MIDI pattern
    midi_data = audio_analyzer.generate_midi_pattern(
        tempo=tempo,
        swing_ratio=swing_ratio,
        num_bars=num_bars
    )
    
    # Check that we have one instrument (drum program)
    assert len(midi_data.instruments) == 1, "Expected exactly one instrument"
    drum_program = midi_data.instruments[0]
    
    # Check that it's a drum program
    assert drum_program.is_drum, "Expected a drum program"
    
    # Check that the notes have valid velocities
    for note in drum_program.notes:
        assert 0 <= note.velocity <= 127, "Note velocity out of range"
        assert note.pitch in [36, 38, 42], "Invalid drum pitch"  # Bass drum, snare, hi-hat 