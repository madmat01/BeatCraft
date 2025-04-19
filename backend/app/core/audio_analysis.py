import librosa
import numpy as np
from scipy.stats import norm
from typing import Tuple, Optional
import pretty_midi

class AudioAnalyzer:
    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate

    def analyze_audio(self, audio_path: str) -> Tuple[float, float, np.ndarray]:
        """
        Analyze audio file to detect tempo, swing ratio, and beat positions.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Tuple containing:
            - tempo: Estimated tempo in BPM
            - swing_ratio: Estimated swing ratio (0.5 = straight, 0.75 = max swing)
            - beat_frames: Array of beat positions in frames
        """
        # Load audio file
        y, sr = librosa.load(audio_path, sr=self.sample_rate)
        
        # Detect onsets
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        
        # Estimate tempo
        tempo, beat_frames = librosa.beat.beat_track(
            onset_envelope=onset_env,
            sr=sr
        )
        
        # Calculate swing ratio
        swing_ratio = self._estimate_swing_ratio(beat_frames, sr)
        
        return tempo, swing_ratio, beat_frames

    def _estimate_swing_ratio(self, beat_frames: np.ndarray, sr: int) -> float:
        """
        Estimate swing ratio from beat positions using Gaussian modeling.
        
        Args:
            beat_frames: Array of beat positions in frames
            sr: Sample rate
            
        Returns:
            Estimated swing ratio (0.5 = straight, 0.75 = max swing)
        """
        # Calculate inter-onset intervals (IOIs)
        iois = np.diff(beat_frames) / sr
        
        # Fit Gaussian to IOIs
        mu, std = norm.fit(iois)
        
        # Calculate swing ratio (normalized to 0.5-0.75 range)
        swing_ratio = min(0.75, max(0.5, mu / (2 * std)))
        
        return swing_ratio

    def generate_midi_pattern(
        self,
        tempo: float,
        swing_ratio: float,
        num_bars: int = 4,
        time_signature: Tuple[int, int] = (4, 4)
    ) -> pretty_midi.PrettyMIDI:
        """
        Generate a basic MIDI drum pattern based on tempo and swing ratio.
        
        Args:
            tempo: Tempo in BPM
            swing_ratio: Swing ratio (0.5 = straight, 0.75 = max swing)
            num_bars: Number of bars to generate
            time_signature: Time signature as (numerator, denominator)
            
        Returns:
            PrettyMIDI object containing the drum pattern
        """
        # Create a PrettyMIDI object
        midi_data = pretty_midi.PrettyMIDI()
        
        # Create a drum program
        drum_program = pretty_midi.Instrument(program=0, is_drum=True)
        
        # Calculate note duration based on swing ratio
        beat_duration = 60.0 / tempo
        swing_duration = beat_duration * swing_ratio
        
        # Generate pattern for specified number of bars
        beats_per_bar = time_signature[0]
        total_beats = num_bars * beats_per_bar
        
        for beat in range(total_beats):
            # Add kick drum on downbeats
            if beat % beats_per_bar == 0:
                note = pretty_midi.Note(
                    velocity=100,
                    pitch=36,  # Bass drum
                    start=beat * beat_duration,
                    end=(beat + 0.5) * beat_duration
                )
                drum_program.notes.append(note)
            
            # Add snare on backbeats
            if beat % beats_per_bar == 2:
                note = pretty_midi.Note(
                    velocity=100,
                    pitch=38,  # Acoustic snare
                    start=beat * beat_duration,
                    end=(beat + 0.5) * beat_duration
                )
                drum_program.notes.append(note)
            
            # Add hi-hats
            note = pretty_midi.Note(
                velocity=80,
                pitch=42,  # Closed hi-hat
                start=beat * beat_duration,
                end=(beat + 0.25) * beat_duration
            )
            drum_program.notes.append(note)
        
        midi_data.instruments.append(drum_program)
        return midi_data 