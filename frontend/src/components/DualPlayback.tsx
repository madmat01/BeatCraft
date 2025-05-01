import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Box, Stack, Typography, Slider, IconButton, Paper, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

interface DualPlaybackProps {
  audioUrl?: string;
  bpm?: number | null;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

/**
 * DualPlayback component that synchronizes the drum sequencer with the original audio file.
 * This component handles both playback sources and provides unified controls.
 */
export const DualPlayback: React.FC<DualPlaybackProps> = ({
  audioUrl,
  bpm = 120,
  onPlayStateChange
}) => {
  // Set the BPM for the transport
  if (bpm) {
    Tone.Transport.bpm.value = bpm;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [audioBuffer, setAudioBuffer] = useState<Tone.ToneAudioBuffer | null>(null);
  const playerRef = useRef<Tone.Player | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Tone.js context on component mount
  useEffect(() => {
    // Initialize Tone.js context but don't start it yet
    // This prepares it for later user interaction
    const initTone = async () => {
      try {
        // Just create the context but don't start it
        if (Tone.context.state === 'suspended') {
          console.log('Tone.js context initialized, waiting for user interaction');
        }
      } catch (err) {
        console.error('Error initializing Tone.js:', err);
      }
    };
    
    initTone();
    
    // Cleanup when component unmounts
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Load audio file when URL changes
  useEffect(() => {
    if (!audioUrl) return;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Dispose of any existing player
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
        
        console.log('Loading audio from URL:', audioUrl);
        // Load audio file using Tone.js for better integration
        const buffer = await Tone.Buffer.fromUrl(audioUrl);
        // Store the Tone.Buffer directly instead of extracting AudioBuffer
        setAudioBuffer(buffer);
        console.log('Audio buffer loaded successfully:', buffer.duration, 'seconds');
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading audio file:', err);
        setError('Failed to load audio file');
        setIsLoading(false);
      }
    };
    
    loadAudio();
    
    // Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [audioUrl]);

  // Handle play button click
  const handlePlay = async () => {
    try {
      // Explicitly start the audio context with user interaction
      if (Tone.context.state !== 'running') {
        console.log('Starting Tone.js context...');
        await Tone.context.resume();
        await Tone.start();
        console.log('Tone.js context started:', Tone.context.state);
      }
      
      // Reset transport position
      Tone.Transport.position = 0;
      
      // Create and play original audio if available
      if (audioBuffer && !playerRef.current) {
        console.log('Creating new player with loaded buffer');
        // Create player with the already loaded buffer
        playerRef.current = new Tone.Player({
          url: audioBuffer,
          // Enable precise scheduling for sample-accurate sync
          fadeIn: 0,
          fadeOut: 0,
          // Ensure the player is ready immediately
          onload: () => console.log('Player loaded and ready for precise sync')
        });
        
        playerRef.current.volume.value = Tone.gainToDb(audioVolume);
        playerRef.current.toDestination();
        
        // Give the player a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Start the audio player if it exists
      if (playerRef.current) {
        try {
          // Make sure the player is loaded before starting
          if (playerRef.current.loaded) {
            // Use precise scheduling for sample-accurate sync
            // Schedule the start time explicitly to ensure sync
            const startTime = Tone.now();
            
            // Start the player in sync with the transport
            playerRef.current.sync();
            
            // Start transport with precise timing
            Tone.Transport.start(startTime);
            playerRef.current.start(startTime);
            
            console.log('Started audio player with sample-accurate sync at time:', startTime);
          } else {
            console.log('Player not loaded yet, waiting for load event');
            // Create a one-time load handler with precise timing
            const onceLoaded = () => {
              if (playerRef.current) {
                const startTime = Tone.now();
                playerRef.current.sync();
                Tone.Transport.start(startTime);
                playerRef.current.start(startTime);
                console.log('Player loaded and started with sample-accurate sync at time:', startTime);
              }
            };
            
            // Set a timeout to check if loaded
            setTimeout(() => {
              if (playerRef.current && playerRef.current.loaded) {
                onceLoaded();
              } else {
                // If still not loaded, start transport anyway for drums
                Tone.Transport.start();
              }
            }, 100);
          }
        } catch (e) {
          console.error('Error starting player:', e);
          // If player fails, at least start the transport for drums
          Tone.Transport.start();
        }
      } else {
        // No audio player, just start transport for drums
        Tone.Transport.start();
      }
      
      setIsPlaying(true);
      if (onPlayStateChange) onPlayStateChange(true);
      console.log('Playback started');
    } catch (err) {
      console.error('Error starting playback:', err);
      setError('Failed to start playback');
      // Try to at least start the transport for drums
      try {
        Tone.Transport.start();
      } catch (e) {
        console.error('Could not start transport either:', e);
      }
    }
  };

  // Handle stop button click
  const handleStop = () => {
    try {
      // Calculate precise stop time for sample-accurate stopping
      const stopTime = Tone.now();
      
      // Stop audio player if it exists with precise timing
      if (playerRef.current) {
        playerRef.current.stop(stopTime);
      }
      
      // Stop Tone.js transport with the same timing
      Tone.Transport.stop(stopTime);
      Tone.Transport.position = 0;
      
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
      console.log('Playback stopped with sample-accurate timing at:', stopTime);
    } catch (err) {
      console.error('Error during synchronized stop:', err);
      
      // Fallback to immediate stop if precise timing fails
      if (playerRef.current) {
        try {
          playerRef.current.stop();
        } catch (playerErr) {
          console.error('Error stopping player:', playerErr);
        }
      }
      
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
    }
  };

  // Handle volume change
  const handleVolumeChange = (_: Event, value: number | number[]) => {
    const vol = value as number;
    setAudioVolume(vol);
    
    if (playerRef.current) {
      try {
        playerRef.current.volume.value = Tone.gainToDb(vol);
      } catch (err) {
        console.error('Error setting volume:', err);
      }
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Dual Playback
      </Typography>
      
      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <div className="loading-spinner" style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }} />
          <Typography variant="body2" color="text.secondary">
            Loading audio file...
          </Typography>
        </Box>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton 
          onClick={isPlaying ? handleStop : handlePlay}
          color="primary"
          size="large"
          disabled={isLoading || (!audioUrl && !audioBuffer)}
        >
          {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
        </IconButton>
        
        <Typography variant="body1" sx={{ ml: 1 }}>
          {isPlaying ? 'Stop' : 'Play'} {audioUrl ? '(Drums + Audio)' : '(Drums Only)'}
        </Typography>
      </Box>
      
      {(audioUrl || audioBuffer) && (
        <Stack direction="row" spacing={2} alignItems="center">
          <VolumeUpIcon color="primary" />
          <Tooltip title="Audio Volume">
            <Slider
              value={audioVolume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.01}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              aria-label="Audio Volume"
              disabled={isLoading}
            />
          </Tooltip>
        </Stack>
      )}
    </Paper>
  );
};

export default DualPlayback;
