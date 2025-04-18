import numpy as np
import scipy.io.wavfile as wav

def create_drum_loop(filename, bpm=120, duration=4, sr=44100):
    """Create a test drum loop with kick and snare at specified BPM"""
    # Calculate samples
    total_samples = int(sr * duration)
    audio = np.zeros(total_samples)
    
    # Calculate beat positions
    beat_samples = int(sr * 60 / bpm)  # samples per beat
    num_beats = int(duration * bpm / 60)
    
    # Create kick drum sound (low frequency sine)
    kick_duration = 0.1  # seconds
    kick_samples = int(sr * kick_duration)
    t_kick = np.linspace(0, kick_duration, kick_samples)
    kick = np.sin(2 * np.pi * 60 * t_kick) * np.exp(-10 * t_kick)
    
    # Create snare drum sound (filtered noise)
    snare_duration = 0.1  # seconds
    snare_samples = int(sr * snare_duration)
    snare = np.random.randn(snare_samples) * np.exp(-5 * np.linspace(0, 1, snare_samples))
    
    # Place kicks on beats 1 and 3, snares on 2 and 4
    for beat in range(num_beats):
        pos = beat * beat_samples
        if beat % 4 in [0, 2]:  # Kicks on 1 and 3
            if pos + len(kick) <= len(audio):
                audio[pos:pos + len(kick)] += kick * 0.5
        else:  # Snares on 2 and 4
            if pos + len(snare) <= len(audio):
                audio[pos:pos + len(snare)] += snare * 0.3
    
    # Normalize
    audio = audio / np.max(np.abs(audio))
    
    # Save as WAV
    wav.write(filename, sr, audio.astype(np.float32))
    return audio, sr

if __name__ == "__main__":
    # Create test files at different tempos
    tempos = [90, 120, 140]
    for bpm in tempos:
        filename = f"tests/test_audio/drum_loop_{bpm}bpm.wav"
        create_drum_loop(filename, bpm=bpm)
        print(f"Created test drum loop at {bpm} BPM")
