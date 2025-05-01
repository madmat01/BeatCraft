import React from 'react';
import { 
  Box, 
  Stack, 
  Typography, 
  Slider, 
  IconButton, 
  Paper,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SpeedIcon from '@mui/icons-material/Speed';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useDrumSequencer, DrumSoundType } from '../hooks/useDrumSequencer';

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
    setVolume,
    playSound,
    setPattern,
    samplesLoaded,
    samplesError,
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
  
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      {/* Show loading state or error if samples aren't loaded */}
      {!samplesLoaded && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1">Loading drum samples...</Typography>
        </Box>
      )}
      
      {samplesError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {samplesError}
        </Alert>
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
                  bgcolor: steps[soundIndex][stepIndex] 
                    ? sound.color 
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: currentStep === stepIndex && isPlaying
                    ? 'primary.main'
                    : 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: steps[soundIndex][stepIndex]
                      ? `${sound.color}dd`
                      : 'action.hover'
                  }
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
