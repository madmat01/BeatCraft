import pretty_midi
import numpy as np
from typing import List, Optional

class MidiGenerator:
    """Generate MIDI files from beat analysis"""
    
    @staticmethod
    def create_drum_pattern(
        beat_times: List[float],
        tempo: float,
        pattern_type: str = "basic",
        velocity: int = 100
    ) -> pretty_midi.PrettyMIDI:
        """
        Create a MIDI drum pattern from beat times
        
        Args:
            beat_times: List of beat timings in seconds
            tempo: Tempo in BPM
            pattern_type: Type of drum pattern ('basic', 'hihat', 'full')
            velocity: MIDI velocity (0-127)
            
        Returns:
            PrettyMIDI object containing the drum pattern
        """
        # Create a PrettyMIDI object
        pm = pretty_midi.PrettyMIDI(initial_tempo=tempo)
        
        # Create a drum program
        drum_program = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
        
        # MIDI note numbers for common drum sounds
        KICK = 36   # Bass Drum
        SNARE = 38  # Snare Drum
        HIHAT = 42  # Closed Hi-Hat
        
        # Create basic drum pattern
        for i, beat_time in enumerate(beat_times):
            # Add kick drum on every beat
            note = pretty_midi.Note(velocity=velocity, pitch=KICK, start=beat_time, end=beat_time + 0.1)
            drum_program.notes.append(note)
            
            if pattern_type in ["hihat", "full"]:
                # Add hi-hat on every eighth note
                if i > 0:
                    prev_time = beat_times[i-1]
                    eighth_time = (beat_time - prev_time) / 2
                    hihat_time = prev_time + eighth_time
                    note = pretty_midi.Note(velocity=velocity-20, pitch=HIHAT, start=hihat_time, end=hihat_time + 0.1)
                    drum_program.notes.append(note)
            
            if pattern_type == "full":
                # Add snare on beats 2 and 4 (assuming 4/4 time)
                if i % 4 in [1, 3]:
                    note = pretty_midi.Note(velocity=velocity-10, pitch=SNARE, start=beat_time, end=beat_time + 0.1)
                    drum_program.notes.append(note)
        
        # Add the drum program to the PrettyMIDI object
        pm.instruments.append(drum_program)
        
        return pm
    
    @staticmethod
    def add_swing(
        midi: pretty_midi.PrettyMIDI,
        swing_ratio: float,
        resolution: int = 480
    ) -> pretty_midi.PrettyMIDI:
        """
        Add swing feel to a MIDI pattern
        
        Args:
            midi: PrettyMIDI object to add swing to
            swing_ratio: Amount of swing (0.5 = straight, ~0.67 = swung)
            resolution: MIDI ticks per quarter note
            
        Returns:
            PrettyMIDI object with swing applied
        """
        if not (0.5 <= swing_ratio <= 0.75):
            return midi  # Return unchanged if swing ratio is out of bounds
        
        # Create a new MIDI object with the same tempo
        new_midi = pretty_midi.PrettyMIDI(initial_tempo=midi.estimate_tempo())
        
        for instrument in midi.instruments:
            new_instrument = pretty_midi.Instrument(
                program=instrument.program,
                is_drum=instrument.is_drum,
                name=instrument.name
            )
            
            # Group notes by their quantized position
            quantized_notes = {}
            for note in instrument.notes:
                # Quantize to the nearest 16th note
                quantized_time = round(note.start * 4) / 4
                if quantized_time not in quantized_notes:
                    quantized_notes[quantized_time] = []
                quantized_notes[quantized_time].append(note)
            
            # Apply swing to off-beat notes
            for time, notes in quantized_notes.items():
                # Check if this is an off-beat (8th note) position
                is_offbeat = (time * 2) % 1 == 0.5
                
                for note in notes:
                    new_note = pretty_midi.Note(
                        velocity=note.velocity,
                        pitch=note.pitch,
                        start=note.start,
                        end=note.end
                    )
                    
                    if is_offbeat:
                        # Apply swing by moving the note
                        beat_duration = 60 / midi.estimate_tempo()
                        swing_offset = (swing_ratio - 0.5) * beat_duration
                        new_note.start += swing_offset
                        new_note.end += swing_offset
                    
                    new_instrument.notes.append(new_note)
            
            new_midi.instruments.append(new_instrument)
        
        return new_midi
