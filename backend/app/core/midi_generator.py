import pretty_midi
import numpy as np
from typing import List, Optional

class MidiGenerator:
    """Class for generating MIDI files from beat analysis"""
    
    # MIDI note numbers for drum sounds (General MIDI drum map)
    KICK = 36       # Bass Drum 1
    SNARE = 38      # Acoustic Snare
    CLOSED_HH = 42  # Closed Hi-Hat
    OPEN_HH = 46    # Open Hi-Hat
    RIDE = 51       # Ride Cymbal 1
    CRASH = 49      # Crash Cymbal 1
    TOM_LOW = 41    # Low Floor Tom
    TOM_MID = 47    # Low-Mid Tom
    TOM_HIGH = 50   # High Tom
    
    @staticmethod
    def create_drum_pattern(
        beat_times: List[float], 
        tempo: float, 
        pattern_type: str = "basic", 
        velocity: int = 100,
        swing_ratio: float = 0.5
    ) -> pretty_midi.PrettyMIDI:
        """
        Create a MIDI drum pattern based on the provided beat times and tempo
        
        Args:
            beat_times: List of beat times in seconds
            tempo: Tempo in BPM
            pattern_type: Type of drum pattern ('basic', 'hihat', or 'full')
            velocity: MIDI velocity (0-127)
            swing_ratio: Swing ratio (0.5 = straight, ~0.67 = swung)
            
        Returns:
            PrettyMIDI object containing the drum pattern
        """
        # Create a PrettyMIDI object
        midi = pretty_midi.PrettyMIDI(initial_tempo=tempo)
        
        # Create a drum instrument
        drum_program = 0  # General MIDI drum channel
        drums = pretty_midi.Instrument(program=drum_program, is_drum=True, name="Drums")
        
        # Apply swing if needed
        if swing_ratio != 0.5:
            beat_times = MidiGenerator._apply_swing(beat_times, swing_ratio)
        
        # Generate the pattern based on the type
        if pattern_type == "basic":
            MidiGenerator._create_basic_pattern(drums, beat_times, velocity)
        elif pattern_type == "hihat":
            MidiGenerator._create_hihat_pattern(drums, beat_times, velocity)
        elif pattern_type == "full":
            MidiGenerator._create_full_pattern(drums, beat_times, velocity)
        else:
            # Default to basic if invalid pattern type
            MidiGenerator._create_basic_pattern(drums, beat_times, velocity)
        
        # Add the drum instrument to the MIDI object
        midi.instruments.append(drums)
        
        return midi
    
    @staticmethod
    def _create_basic_pattern(drums, beat_times, velocity):
        """Create a basic kick and snare pattern"""
        for i, beat_time in enumerate(beat_times):
            # Kick on beats 1 and 3 (assuming 4/4 time)
            if i % 4 == 0 or i % 4 == 2:
                note = pretty_midi.Note(
                    velocity=velocity,
                    pitch=MidiGenerator.KICK,
                    start=beat_time,
                    end=beat_time + 0.1
                )
                drums.notes.append(note)
            
            # Snare on beats 2 and 4
            if i % 4 == 1 or i % 4 == 3:
                note = pretty_midi.Note(
                    velocity=velocity,
                    pitch=MidiGenerator.SNARE,
                    start=beat_time,
                    end=beat_time + 0.1
                )
                drums.notes.append(note)
    
    @staticmethod
    def _create_hihat_pattern(drums, beat_times, velocity):
        """Create a pattern with kick, snare, and hi-hats"""
        # First add the basic kick and snare
        MidiGenerator._create_basic_pattern(drums, beat_times, velocity)
        
        # Add hi-hats on every beat
        for beat_time in beat_times:
            note = pretty_midi.Note(
                velocity=velocity,
                pitch=MidiGenerator.CLOSED_HH,
                start=beat_time,
                end=beat_time + 0.1
            )
            drums.notes.append(note)
        
        # Add hi-hats on the eighth notes between beats
        for i in range(len(beat_times) - 1):
            # Calculate the time halfway between beats
            eighth_note_time = (beat_times[i] + beat_times[i+1]) / 2
            
            note = pretty_midi.Note(
                velocity=velocity - 20,  # Slightly quieter
                pitch=MidiGenerator.CLOSED_HH,
                start=eighth_note_time,
                end=eighth_note_time + 0.1
            )
            drums.notes.append(note)
    
    @staticmethod
    def _create_full_pattern(drums, beat_times, velocity):
        """Create a full drum kit pattern with variations"""
        # Start with the hi-hat pattern
        MidiGenerator._create_hihat_pattern(drums, beat_times, velocity)
        
        # Add crash cymbal on the first beat
        if beat_times:
            crash_note = pretty_midi.Note(
                velocity=velocity + 10,  # Slightly louder
                pitch=MidiGenerator.CRASH,
                start=beat_times[0],
                end=beat_times[0] + 0.2
            )
            drums.notes.append(crash_note)
        
        # Add ride cymbal on some beats for variation
        for i, beat_time in enumerate(beat_times):
            if i % 8 >= 4:  # Second half of 8-beat pattern
                note = pretty_midi.Note(
                    velocity=velocity - 10,
                    pitch=MidiGenerator.RIDE,
                    start=beat_time,
                    end=beat_time + 0.1
                )
                drums.notes.append(note)
        
        # Add tom fills at the end of 16-beat sections
        for i, beat_time in enumerate(beat_times):
            if i % 16 == 15:  # Last beat of 16-beat pattern
                # Add a three-tom fill
                if i > 0 and i < len(beat_times) - 2:
                    # High tom
                    tom_high = pretty_midi.Note(
                        velocity=velocity,
                        pitch=MidiGenerator.TOM_HIGH,
                        start=beat_times[i-1],
                        end=beat_times[i-1] + 0.1
                    )
                    drums.notes.append(tom_high)
                    
                    # Mid tom
                    tom_mid = pretty_midi.Note(
                        velocity=velocity,
                        pitch=MidiGenerator.TOM_MID,
                        start=beat_times[i],
                        end=beat_times[i] + 0.1
                    )
                    drums.notes.append(tom_mid)
                    
                    # Low tom
                    tom_low = pretty_midi.Note(
                        velocity=velocity,
                        pitch=MidiGenerator.TOM_LOW,
                        start=beat_times[i+1],
                        end=beat_times[i+1] + 0.1
                    )
                    drums.notes.append(tom_low)
    
    @staticmethod
    def _apply_swing(beat_times: List[float], swing_ratio: float) -> List[float]:
        """
        Apply swing to the beat times
        
        Args:
            beat_times: Original beat times
            swing_ratio: Swing ratio (0.5 = straight, ~0.67 = swung)
            
        Returns:
            List of beat times with swing applied
        """
        swung_beats = beat_times.copy()
        
        # Apply swing to every other eighth note
        for i in range(len(beat_times) - 1):
            if i % 2 == 1:  # Only adjust odd-indexed beats
                # Calculate the straight eighth note time
                straight_time = beat_times[i]
                
                # Calculate the previous and next quarter note times
                prev_quarter = beat_times[i-1]
                next_quarter = beat_times[i+1] if i+1 < len(beat_times) else beat_times[i] + (beat_times[i] - prev_quarter)
                
                # Calculate the quarter note duration
                quarter_duration = next_quarter - prev_quarter
                
                # Apply swing
                swung_time = prev_quarter + quarter_duration * swing_ratio
                swung_beats[i] = swung_time
        
        return swung_beats
    
    @staticmethod
    def generate_midi_file(
        beat_times: List[float], 
        tempo: float, 
        output_path: str,
        pattern_type: str = "basic", 
        velocity: int = 100,
        swing_ratio: float = 0.5
    ) -> None:
        """
        Generate and save a MIDI file based on the provided beat times and tempo
        
        Args:
            beat_times: List of beat times in seconds
            tempo: Tempo in BPM
            output_path: Path to save the MIDI file
            pattern_type: Type of drum pattern ('basic', 'hihat', or 'full')
            velocity: MIDI velocity (0-127)
            swing_ratio: Swing ratio (0.5 = straight, ~0.67 = swung)
        """
        midi = MidiGenerator.create_drum_pattern(
            beat_times=beat_times,
            tempo=tempo,
            pattern_type=pattern_type,
            velocity=velocity,
            swing_ratio=swing_ratio
        )
        
        # Write the MIDI file
        midi.write(output_path)
