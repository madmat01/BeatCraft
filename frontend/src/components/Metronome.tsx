import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Box, Slider, Typography, Stack, Switch, FormControlLabel } from '@mui/material';

interface MetronomeProps {
  bpm: number;
  isPlaying: boolean;
  onBpmChange?: (bpm: number) => void;
}

/**
 * Metronome component that provides visual and audio metronome functionality
 * synchronized with Tone.js Transport
 */
const Metronome: React.FC<MetronomeProps> = ({ bpm, isPlaying, onBpmChange }) => {
  const [localBpm, setLocalBpm] = useState(bpm);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [visualMetronomeEnabled, setVisualMetronomeEnabled] = useState(true);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Initialize metronome sound
  useEffect(() => {
    // Create a synth for metronome clicks
    const clickSynth = new Tone.Synth({
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      },
      volume: -15
    }).toDestination();

    // Schedule metronome clicks on quarter notes (1/4)
    const clickId = Tone.Transport.scheduleRepeat((time) => {
      if (metronomeEnabled) {
        // Play a higher pitch on the first beat of each measure (assuming 4/4 time)
        const beat = Math.floor(Tone.Transport.position.toString().split(':')[1]);
        const isFirstBeat = beat === 0;
        
        // Play different pitches for accented vs. regular beats
        clickSynth.triggerAttackRelease(
          isFirstBeat ? 'C5' : 'G4', 
          '32n', 
          time
        );
        
        // Update visual metronome
        if (visualMetronomeEnabled) {
          setCurrentBeat(beat);
        }
      }
    }, '4n'); // Quarter note interval

    // Clean up
    return () => {
      Tone.Transport.clear(clickId);
      clickSynth.dispose();
    };
  }, [metronomeEnabled, visualMetronomeEnabled]);

  // Update BPM when prop changes
  useEffect(() => {
    setLocalBpm(bpm);
  }, [bpm]);

  // Handle BPM change
  const handleBpmChange = (_: Event, value: number | number[]) => {
    const newBpm = value as number;
    setLocalBpm(newBpm);
    
    if (onBpmChange) {
      onBpmChange(newBpm);
    }
  };

  // Visual metronome display
  const renderBeats = () => {
    // Assuming 4/4 time signature
    const beats = [0, 1, 2, 3];
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        {beats.map((beat) => (
          <Box 
            key={beat}
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: currentBeat === beat && isPlaying && visualMetronomeEnabled
                ? (beat === 0 ? 'primary.main' : 'secondary.main')
                : 'action.disabled',
              transition: 'background-color 0.1s ease'
            }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ minWidth: 65 }}>
          BPM: {localBpm}
        </Typography>
        <Slider
          value={localBpm}
          onChange={handleBpmChange}
          min={40}
          max={220}
          step={1}
          valueLabelDisplay="auto"
          aria-label="BPM"
          sx={{ flexGrow: 1 }}
        />
      </Stack>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={metronomeEnabled}
              onChange={(e) => setMetronomeEnabled(e.target.checked)}
            />
          }
          label={<Typography variant="body2">Audio Click</Typography>}
        />
        
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={visualMetronomeEnabled}
              onChange={(e) => setVisualMetronomeEnabled(e.target.checked)}
            />
          }
          label={<Typography variant="body2">Visual Beat</Typography>}
        />
      </Box>
      
      {visualMetronomeEnabled && renderBeats()}
    </Box>
  );
};

export default Metronome;
