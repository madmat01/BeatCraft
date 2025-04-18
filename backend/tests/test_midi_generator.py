import pytest
import pretty_midi
import numpy as np
from app.core.midi_generator import MidiGenerator

def test_create_basic_drum_pattern():
    """Test creating a basic drum pattern"""
    # Create a simple 4-beat pattern
    beat_times = [0.0, 0.5, 1.0, 1.5]
    tempo = 120
    
    # Generate MIDI with basic pattern
    midi = MidiGenerator.create_drum_pattern(beat_times, tempo, "basic")
    
    # Check that we have one drum instrument
    assert len(midi.instruments) == 1
    assert midi.instruments[0].is_drum
    
    # Check that we have the correct number of notes (4 kicks)
    assert len(midi.instruments[0].notes) == 4
    
    # Check that all notes are kick drums (MIDI note 36)
    assert all(note.pitch == 36 for note in midi.instruments[0].notes)
    
    # Check note timing
    for i, note in enumerate(midi.instruments[0].notes):
        assert abs(note.start - beat_times[i]) < 0.001

def test_create_hihat_pattern():
    """Test creating a pattern with hi-hats"""
    beat_times = [0.0, 0.5, 1.0, 1.5]
    tempo = 120
    
    # Generate MIDI with hi-hat pattern
    midi = MidiGenerator.create_drum_pattern(beat_times, tempo, "hihat")
    
    # We should have kicks on the beats and hi-hats on the eighth notes
    # So 4 kicks + 3 hi-hats (no hi-hat before first beat)
    assert len(midi.instruments[0].notes) == 7
    
    # Count kicks and hi-hats
    kicks = sum(1 for note in midi.instruments[0].notes if note.pitch == 36)
    hihats = sum(1 for note in midi.instruments[0].notes if note.pitch == 42)
    
    assert kicks == 4
    assert hihats == 3

def test_create_full_pattern():
    """Test creating a full drum pattern"""
    # Create a full bar in 4/4
    beat_times = [0.0, 0.5, 1.0, 1.5]
    tempo = 120
    
    # Generate MIDI with full pattern
    midi = MidiGenerator.create_drum_pattern(beat_times, tempo, "full")
    
    # Count different drum types
    kicks = sum(1 for note in midi.instruments[0].notes if note.pitch == 36)
    snares = sum(1 for note in midi.instruments[0].notes if note.pitch == 38)
    hihats = sum(1 for note in midi.instruments[0].notes if note.pitch == 42)
    
    # Should have:
    # - 4 kicks (every beat)
    # - 2 snares (beats 2 and 4)
    # - 3 hi-hats (between beats)
    assert kicks == 4
    assert snares == 2
    assert hihats == 3

def test_add_swing():
    """Test adding swing to a MIDI pattern"""
    # Create a basic pattern
    beat_times = [0.0, 0.5, 1.0, 1.5]
    tempo = 120
    midi = MidiGenerator.create_drum_pattern(beat_times, tempo, "hihat")
    
    # Add swing
    swing_ratio = 0.67  # Traditional jazz swing
    swung_midi = MidiGenerator.add_swing(midi, swing_ratio)
    
    # The kicks should stay on the beat
    kicks = [note for note in swung_midi.instruments[0].notes if note.pitch == 36]
    for i, kick in enumerate(kicks):
        assert abs(kick.start - beat_times[i]) < 0.001
    
    # The hi-hats should be delayed by the swing amount
    hihats = [note for note in swung_midi.instruments[0].notes if note.pitch == 42]
    for hihat in hihats:
        # Find the nearest beat time
        nearest_beat = min(beat_times, key=lambda x: abs(x - hihat.start))
        # Check that the hi-hat is delayed by the swing amount
        expected_offset = (swing_ratio - 0.5) * (60 / tempo)
        actual_offset = hihat.start - nearest_beat
        assert abs(actual_offset - expected_offset) < 0.001

def test_invalid_swing():
    """Test that invalid swing ratios are handled correctly"""
    # Create a basic pattern
    beat_times = [0.0, 0.5, 1.0, 1.5]
    tempo = 120
    midi = MidiGenerator.create_drum_pattern(beat_times, tempo, "basic")
    
    # Test with invalid swing ratios
    for invalid_ratio in [0.4, 0.8]:
        swung_midi = MidiGenerator.add_swing(midi, invalid_ratio)
        # Should return unchanged MIDI
        assert len(swung_midi.instruments[0].notes) == len(midi.instruments[0].notes)
        for orig_note, new_note in zip(midi.instruments[0].notes, swung_midi.instruments[0].notes):
            assert orig_note.start == new_note.start
            assert orig_note.end == new_note.end
