# Product Requirements Document (PRD)  
## Audio-Driven Drum Pattern Generator & Editor Application

---

## 1. Overview

**Product Name:** BeatCraft (working title)  
**Purpose:**  
An application that analyzes an audio file to detect tempo, time feel (e.g., swing/shuffle), and generates an editable drum MIDI track. Users can customize drum components (kick, snare, hi-hat, cymbals) at a granular level, adjust time feel, and export the results as MIDI. The app includes sample library management and a metronome-guided recording feature to improve input accuracy.

**Target Users:**  
- Musicians and producers seeking quick drum pattern generation from audio  
- Drummers wanting to create MIDI drum tracks from live recordings  
- Hobbyists and educators exploring rhythm and MIDI editing  

---

## 2. Goals and Objectives

- Accurately detect tempo and time feel from audio input  
- Generate a MIDI drum pattern aligned with detected tempo and groove  
- Provide a user-friendly interface for detailed drum pattern editing  
- Allow users to assign custom drum samples for playback  
- Enable metronome-guided recording to improve timing accuracy  
- Export editable MIDI files compatible with major DAWs  

---

## 3. Key Features

### 3.1 Audio Analysis & Tempo Extraction  
- Transient detection using onset energy functions (LibROSA)  
- Tempo estimation via autocorrelation and beat tracking  
- Swing ratio estimation using Gaussian modeling of inter-onset intervals  

### 3.2 Time Feel Adjustment  
- Swing/shuffle slider (0% straight to ~75% shuffle)  
- Microtiming offset control (±50 ms)  
- Visual grid showing swung vs. straight note placements  

### 3.3 Drum Pattern Generation & Editing  
- Template-based initial pattern generation mapped to detected tempo  
- Per-instrument editing: velocity, occurrence probability, timing offset  
- Step sequencer grid with drag-and-drop note placement  
- Mute/solo and velocity curve controls per drum component  

### 3.4 Sample Library & Playback  
- Default drum kit with categorized samples (acoustic, electronic, percussion)  
- Custom sample assignment via drag-and-drop WAV/MP3 files  
- Real-time sample playback with time-stretching to match tempo  
- Preview and audition samples in-app  

### 3.5 Metronome-Guided Recording  
- Tempo input with tap-tempo and count-in options  
- Customizable metronome sounds  
- Visual metronome with bouncing ball animation  
- Non-destructive transient markers and toggle between raw and quantized timing  

### 3.6 Export & Integration  
- Export drum patterns as General MIDI-compatible `.mid` files  
- Integration hooks for major DAWs (Logic Pro, Ableton Live, Cubase) via MIDI export  

---

## 4. Technical Architecture

### 4.1 Backend (Python)  
- **Libraries:**  
  - `librosa` for audio analysis (onset detection, tempo, beat tracking)  
  - `numpy` and `scipy` for signal processing and Gaussian fitting  
  - `mido` or `pretty_midi` for MIDI file creation and manipulation  
  - `flask` or `fastapi` for REST API endpoints serving analysis results and MIDI files  
- **Sample code snippet for tempo and swing analysis:**
