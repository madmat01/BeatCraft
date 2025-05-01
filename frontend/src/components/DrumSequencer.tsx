import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { 
  Box, 
  Stack, 
  Typography, 
  Slider, 
  IconButton, 
  Paper,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useDrumSequencer, DrumSoundType, DrumStep } from '../hooks/useDrumSequencer';

// Define drum sound info
interface DrumSound {
  name: string;
  type: DrumSoundType;
  color: string;
}

// Define drum sounds
const DRUM_SOUNDS: DrumSound[] = [
  { name: 'Kick', type: 'kick', color: '#f48fb1' },
  { name: 'Snare', type: 'snare', color: '#90caf9' },
  { name: 'Hi-Hat', type: 'hihat', color: '#81c784' },
  { name: 'Clap', type: 'clap', color: '#ffb74d' },
];

interface DrumSequencerProps {
  initialBpm?: number;
  initialSwing?: number;
  initialPattern?: boolean[][];
  externalPlayState?: boolean;
}

export const DrumSequencer = React.forwardRef<{
  startPlayback: () => void;
  stopPlayback: () => void;
}, DrumSequencerProps>(({
  initialBpm = 120,
  initialSwing = 0,
  initialPattern,
  externalPlayState,
}, ref) => {
  const { 
    isPlaying, 
    currentStep, 
    bpm, 
    swing, 
    steps, 
    volume, 
    togglePlay, 
    stop, 
    setBpm, 
    setSwing, 
    toggleStep,
    setStepVelocity,
    setVolume,
    playSound,
    samplesLoaded,
    samplesError,
    setPattern
  } = useDrumSequencer(initialBpm, initialSwing);

  // Load initial pattern if provided
  React.useEffect(() => {
    if (initialPattern && samplesLoaded) {
      setPattern(initialPattern);
      console.log('Loaded initial pattern into sequencer');
    }
  }, [initialPattern, samplesLoaded, setPattern]);
  
  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    startPlayback: async () => {
      if (!isPlaying && samplesLoaded) {
        await togglePlay();
      }
    },
    stopPlayback: () => {
      if (isPlaying) {
        stop();
      }
    }
  }), [isPlaying, togglePlay, stop, samplesLoaded]);
  
  // Respond to external play state changes
  React.useEffect(() => {
    if (externalPlayState !== undefined && externalPlayState !== isPlaying && samplesLoaded) {
      if (externalPlayState) {
        // Only start if not already playing
        if (!isPlaying) {
          togglePlay();
        }
      } else {
        // Only stop if currently playing
        if (isPlaying) {
          stop();
        }
      }
    }
  }, [externalPlayState, isPlaying, togglePlay, stop, samplesLoaded]);
  
  // State for step editor dialog
  const [selectedStep, setSelectedStep] = React.useState<{ soundIndex: number; stepIndex: number } | null>(null);
  const [stepEditorOpen, setStepEditorOpen] = React.useState(false);
  
  // Handle velocity change in the editor
  const handleVelocityChange = (value: number) => {
    if (selectedStep) {
      setStepVelocity(selectedStep.soundIndex, selectedStep.stepIndex, value);
    }
  };
  

  
  // Handle closing the step editor dialog
  const handleCloseStepEditor = () => {
    setStepEditorOpen(false);
    setSelectedStep(null);
  };
  
  // Get sound type from index
  const getSoundType = (soundIndex: number): DrumSoundType => {
    return DRUM_SOUNDS[soundIndex].type;
  };
  
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      {/* Show loading state or error if samples aren't loaded */}
      {!samplesLoaded && !samplesError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading drum samples...</Typography>
        </Box>
      )}
      
      {samplesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {samplesError}
        </Alert>
      )}
      
      {/* Step Editor Dialog */}
      {selectedStep && (
        <Dialog open={stepEditorOpen} onClose={handleCloseStepEditor}>
          <DialogTitle>
            Edit Velocity for {DRUM_SOUNDS[selectedStep.soundIndex].name} Step {selectedStep.stepIndex + 1}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ width: 300, mt: 2 }}>
              <Typography gutterBottom>Velocity: {Math.round(steps[selectedStep.soundIndex][selectedStep.stepIndex].velocity * 100)}%</Typography>
              <Slider
                value={steps[selectedStep.soundIndex][selectedStep.stepIndex].velocity}
                onChange={(_, value) => handleVelocityChange(value as number)}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value as number * 100)}%`}
              />
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  onClick={() => {
                    playSound(DRUM_SOUNDS[selectedStep.soundIndex].type, steps[selectedStep.soundIndex][selectedStep.stepIndex].velocity);
                  }}
                >
                  Test Sound
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseStepEditor}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={isPlaying ? stop : togglePlay}
            color="primary"
            size="large"
            disabled={!samplesLoaded}
          >
            {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            {isPlaying ? 'Stop' : 'Play'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <SpeedIcon color="primary" />
            <Tooltip title="Tempo (BPM)">
              <Slider
                value={bpm}
                onChange={(_, value) => setBpm(value as number)}
                min={60}
                max={180}
                valueLabelDisplay="auto"
                aria-label="Tempo"
              />
            </Tooltip>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <ShuffleIcon color="primary" />
            <Tooltip title="Swing">
              <Slider
                value={swing}
                onChange={(_, value) => setSwing(value as number)}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                aria-label="Swing"
              />
            </Tooltip>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <VolumeUpIcon color="primary" />
            <Tooltip title="Volume">
              <Slider
                value={volume}
                onChange={(_, value) => setVolume(value as number)}
                min={-40}
                max={6}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} dB`}
                aria-label="Volume"
              />
            </Tooltip>
          </Stack>
        </Box>
      </Box>
      
      {DRUM_SOUNDS.map((sound, soundIndex) => (
        <Box key={sound.name} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={samplesLoaded ? `Play ${sound.name}` : 'Loading samples...'}>
              <Typography 
                variant="body1" 
                sx={{ 
                  width: 100,
                  color: samplesLoaded ? sound.color : 'text.disabled',
                  cursor: samplesLoaded ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  '&:hover': {
                    textDecoration: samplesLoaded ? 'underline' : 'none'
                  },
                  opacity: samplesLoaded ? 1 : 0.7
                }}
                onClick={() => samplesLoaded && playSound(sound.type)}
              >
                {sound.name}
              </Typography>
            </Tooltip>
            {Array(16).fill(null).map((_, stepIndex) => (
              <Box 
                key={stepIndex}
                onClick={() => toggleStep(soundIndex, stepIndex)}
                sx={{
                  width: 40,
                  height: 40,
                  position: 'relative',
                  bgcolor: steps[soundIndex][stepIndex].active ? sound.color : 'background.paper',
                  border: '1px solid',
                  borderColor: currentStep === stepIndex && isPlaying ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: steps[soundIndex][stepIndex].active ? `${sound.color}dd` : 'action.hover',
                  },
                  // Show velocity as a vertical fill
                  '&::after': steps[soundIndex][stepIndex].active ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${steps[soundIndex][stepIndex].velocity * 100}%`,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    pointerEvents: 'none',
                  } : {},

                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelectedStep({ soundIndex, stepIndex });
                  setStepEditorOpen(true);
                }}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  );
});

export default DrumSequencer;
