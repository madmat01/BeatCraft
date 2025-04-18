import pytest
import pretty_midi
import tempfile
import os
from app.core.midi_generator import MidiGenerator

def test_create_basic_drum_pattern():
    """Test creating a basic drum pattern"""
    # Test data
    beat_times = [0.0, 0.5, 1.0, 1.5, 2.0]
    tempo = 120.0
    
    # Generate MIDI
    midi = MidiGenerator.create_drum_pattern(
        beat_times=beat_times,
        tempo=tempo,
        pattern_type="basic",
        velocity=100
    )
    
    # Verify it's a valid MIDI object
    assert isinstance(midi, pretty_midi.PrettyMIDI)
    
    # Verify it has a drum track
    assert len(midi.instruments) > 0
    assert midi.instruments[0].is_drum
    
    # Verify it has notes corresponding to our beat times
    assert len(midi.instruments[0].notes) > 0

def test_create_hihat_drum_pattern():
    """Test creating a hi-hat drum pattern"""
    # Test data
    beat_times = [0.0, 0.5, 1.0, 1.5, 2.0]
    tempo = 120.0
    
    # Generate MIDI
    midi = MidiGenerator.create_drum_pattern(
        beat_times=beat_times,
        tempo=tempo,
        pattern_type="hihat",
        velocity=100
    )
    
    # Verify it has more notes than the basic pattern (should have hi-hats between beats)
    assert isinstance(midi, pretty_midi.PrettyMIDI)
    assert len(midi.instruments) > 0
    
    # Hi-hat pattern should have more notes than just the beats
    assert len(midi.instruments[0].notes) > len(beat_times)

def test_create_full_drum_pattern():
    """Test creating a full drum pattern"""
    # Test data
    beat_times = [0.0, 0.5, 1.0, 1.5, 2.0]
    tempo = 120.0
    
    # Generate MIDI
    midi = MidiGenerator.create_drum_pattern(
        beat_times=beat_times,
        tempo=tempo,
        pattern_type="full",
        velocity=100
    )
    
    # Verify it has a complete drum kit
    assert isinstance(midi, pretty_midi.PrettyMIDI)
    assert len(midi.instruments) > 0
    
    # Full pattern should have even more notes
    assert len(midi.instruments[0].notes) > len(beat_times) * 2

def test_apply_swing():
    """Test applying swing to a MIDI pattern"""
    # Create a basic pattern first
    beat_times = [0.0, 0.5, 1.0, 1.5, 2.0]
    tempo = 120.0
    
    # Generate MIDI without swing
    midi_straight = MidiGenerator.create_drum_pattern(
        beat_times=beat_times,
        tempo=tempo,
        pattern_type="basic",
        velocity=100
    )
    
    # Generate MIDI with swing
    midi_swung = MidiGenerator.create_drum_pattern(
        beat_times=beat_times,
        tempo=tempo,
        pattern_type="basic",
        velocity=100,
        swing_ratio=0.67
    )
    
    # Get note timings
    straight_notes = midi_straight.instruments[0].notes
    swung_notes = midi_swung.instruments[0].notes
    
    # Verify that the swung pattern has the same number of notes
    assert len(straight_notes) == len(swung_notes)
    
    # But the timing should be different
    if len(straight_notes) > 1 and len(swung_notes) > 1:
        # Compare the first few notes to see if they have different timings
        timing_differences = [abs(s.start - w.start) for s, w in zip(straight_notes[:4], swung_notes[:4])]
        assert any(diff > 0.01 for diff in timing_differences)

def test_generate_midi_file():
    """Test generating and saving a MIDI file"""
    # Test data
    beat_times = [0.0, 0.5, 1.0, 1.5, 2.0]
    tempo = 120.0
    
    # Create a temporary directory for our test files
    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = os.path.join(temp_dir, "test_drum_pattern.mid")
        
        try:
            # Generate and save MIDI
            MidiGenerator.generate_midi_file(
                beat_times=beat_times,
                tempo=tempo,
                output_path=output_path,
                pattern_type="basic",
                velocity=100,
                swing_ratio=0.5
            )
            
            # Verify the file exists and is a valid MIDI file
            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
            
            # Try loading it back to verify it's valid
            midi = pretty_midi.PrettyMIDI(output_path)
            assert isinstance(midi, pretty_midi.PrettyMIDI)
            
            # Verify it has a drum instrument
            assert len(midi.instruments) > 0
            assert midi.instruments[0].is_drum
            
            # Verify it has notes
            assert len(midi.instruments[0].notes) > 0
            
        except Exception as e:
            raise e
        finally:
            # The TemporaryDirectory context manager will clean up automatically
            pass
