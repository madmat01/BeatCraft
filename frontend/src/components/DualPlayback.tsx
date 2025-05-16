import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Box, Stack, Typography, Slider, IconButton, Paper, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import apiService from '../services/api';
import Metronome from './Metronome';
import WaveformVisualizer from './WaveformVisualizer';

// Add loading spinner animation
const spinnerAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const style = document.createElement('style');
style.innerHTML = spinnerAnimation;
document.head.appendChild(style);

interface DualPlaybackProps {
  audioUrl?: string;
  audioFile?: File;
  bpm?: number | null;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

/**
 * DualPlayback component that synchronizes the drum sequencer with the original audio file.
 * This component handles both playback sources and provides unified controls.
 */
export const DualPlayback: React.FC<DualPlaybackProps> = ({
  audioUrl,
  audioFile,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio synchronization state
  const [startOffset, setStartOffset] = useState(0); // in seconds, can be negative
  const [firstTransientTime, setFirstTransientTime] = useState<number | null>(null);
  const [isDetectingTransient, setIsDetectingTransient] = useState(false);
  const [showTransientHelp, setShowTransientHelp] = useState(false);
  
  // Toggle mute function
  const toggleMute = () => {
    if (audioVolume === 0) {
      setAudioVolume(0.8);
    } else {
      setAudioVolume(0);
    }
  };

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
  // Function to validate and format audio URL
  const getValidAudioUrl = (url: string) => {
    if (!url) return '';
    
    try {
      // Handle blob URLs (for uploaded files)
      if (url.startsWith('blob:')) {
        console.log('Using blob URL:', url);
        return url;
      }

      // Handle absolute URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('Using absolute URL:', url);
        return url;
      }

      // For all other cases, ensure it's a full URL
      const fullUrl = new URL(url, window.location.origin).toString();
      console.log('Using full URL:', fullUrl);
      return fullUrl;
    } catch (e) {
      console.error('Error formatting URL:', e);
      return '';
    }
  };

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
        
        const validUrl = getValidAudioUrl(audioUrl);
        console.log('Loading audio from URL:', validUrl);
        // Load audio file using Tone.js for better integration
        const buffer = await Tone.Buffer.fromUrl(validUrl);
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

  // Detect first transient when audio file changes
  useEffect(() => {
    if (!audioFile) return;
    
    const detectTransient = async () => {
      try {
        setIsDetectingTransient(true);
        setError(null);
        
        try {
          const response = await apiService.detectFirstTransient(audioFile);
          setFirstTransientTime(response.first_transient_time);
          console.log('First transient detected at:', response.first_transient_time, 'seconds');
        } catch (apiErr: any) {
          // Handle 404 error gracefully - backend endpoint might not be available
          if (apiErr?.response?.status === 404) {
            console.warn('Transient detection endpoint not available - using default value');
            // Use a default value instead
            setFirstTransientTime(0);
          } else {
            // For other errors, propagate them
            throw apiErr;
          }
        }
        
        setIsDetectingTransient(false);
      } catch (err) {
        console.error('Error detecting first transient:', err);
        // Don't show error to user for this feature
        // setError('Failed to detect first transient');
        setIsDetectingTransient(false);
      }
    };
    
    detectTransient();
  }, [audioFile]);

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
            
            // Apply the start offset to the audio playback
            // If offset is negative, delay the transport start
            // If offset is positive, delay the audio start
            if (startOffset < 0) {
              // Negative offset means audio should start earlier than drums
              // Start transport with a delay
              Tone.Transport.start(startTime + Math.abs(startOffset));
              playerRef.current.start(startTime);
              console.log('Started audio immediately, delaying transport by:', Math.abs(startOffset), 'seconds');
            } else {
              // Positive offset means audio should start later than drums
              // Start transport immediately, delay audio
              Tone.Transport.start(startTime);
              playerRef.current.start(startTime + startOffset);
              console.log('Started transport immediately, delaying audio by:', startOffset, 'seconds');
            }
            
            console.log('Started audio player with sample-accurate sync at time:', startTime, 'with offset:', startOffset);
          } else {
            console.log('Player not loaded yet, waiting for load event');
            // Create a one-time load handler with precise timing
            const onceLoaded = () => {
              if (playerRef.current) {
                const startTime = Tone.now();
                playerRef.current.sync();
                
                // Apply the start offset to the audio playback
                if (startOffset < 0) {
                  Tone.Transport.start(startTime + Math.abs(startOffset));
                  playerRef.current.start(startTime);
                } else {
                  Tone.Transport.start(startTime);
                  playerRef.current.start(startTime + startOffset);
                }
                
                console.log('Player loaded and started with sample-accurate sync at time:', startTime, 'with offset:', startOffset);
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

  // Handle offset change from slider
  const handleOffsetChange = (_: Event | React.ChangeEvent<{}>, value: number | number[]) => {
    const offset = Array.isArray(value) ? value[0] : value;
    // Convert from milliseconds to seconds
    const offsetInSeconds = offset / 1000;
    
    // Only update if the value actually changed to reduce unnecessary rerenders
    if (offsetInSeconds !== startOffset) {
      setStartOffset(offsetInSeconds);
      console.log('Audio start offset changed to:', offsetInSeconds, 'seconds');
      
      // If currently playing, restart playback with new offset
      if (isPlaying) {
        handleStop();
        // Small delay to ensure everything is stopped
        setTimeout(() => {
          handlePlay();
        }, 100);
      }
    }
  };
  
  // Handle offset change from waveform marker drag
  const handleWaveformOffsetChange = (offsetInSeconds: number) => {
    // Only update if the value actually changed to reduce unnecessary rerenders
    if (offsetInSeconds !== startOffset) {
      setStartOffset(offsetInSeconds);
      console.log('Audio start offset changed by waveform drag to:', offsetInSeconds, 'seconds');
      
      // If currently playing, restart playback with new offset
      if (isPlaying) {
        handleStop();
        // Small delay to ensure everything is stopped
        setTimeout(() => {
          handlePlay();
        }, 100);
      }
    }
  };
  
  // Reference to store the timeout ID
  const offsetTimeoutRef = useRef<number | null>(null);
  
  // Debounced version of offset change to prevent too many updates
  const debouncedOffsetChange = (event: Event | React.ChangeEvent<{}>, value: number | number[]) => {
    // Clear any existing timeout
    if (offsetTimeoutRef.current !== null) {
      window.clearTimeout(offsetTimeoutRef.current);
    }
    
    // Set a new timeout
    offsetTimeoutRef.current = window.setTimeout(() => {
      handleOffsetChange(event, value);
      offsetTimeoutRef.current = null;
    }, 50); // 50ms debounce time
  };

  // Reset offset to zero
  const handleResetOffset = () => {
    setStartOffset(0);
    
    // If currently playing, restart playback with reset offset
    if (isPlaying) {
      handleStop();
      // Small delay to ensure everything is stopped
      setTimeout(() => {
        handlePlay();
      }, 100);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Dual Playback
      </Typography>
      
      {!audioUrl && !isLoading && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Upload an audio file to play
          </Typography>
        </Box>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          {audioUrl ? (
            <Box>
              <Typography variant="body2" gutterBottom>Audio Player</Typography>
              <WaveformVisualizer
                audioUrl={audioUrl ? getValidAudioUrl(audioUrl) : undefined}
                isPlaying={isPlaying}
                onReady={() => {
                  console.log('Waveform visualizer ready');
                  setIsLoading(false);
                }}
                height={100}
                waveColor="#4a90e2"
                progressColor="#2c5282"
                startOffset={startOffset}
                onOffsetChange={handleWaveformOffsetChange}
              />
              
              {/* Audio Start Offset control moved here, directly under the waveform */}
              {(audioUrl || audioBuffer) && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">
                      Audio Start Offset (ms)
                    </Typography>
                    <Tooltip title="Adjust the timing of the audio relative to the drum sequencer. Negative values play audio earlier, positive values play audio later.">
                      <IconButton 
                        size="small" 
                        onClick={() => setShowTransientHelp(!showTransientHelp)}
                      >
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton 
                      size="small" 
                      onClick={handleResetOffset} 
                      title="Reset offset to zero"
                    >
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  
                  {showTransientHelp && (
                    <Box sx={{ mt: 1, mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, fontSize: '0.875rem' }}>
                      <Typography variant="body2" color="text.secondary">
                        This control adjusts the timing between the drum sequencer and the original audio.
                        {firstTransientTime !== null && (
                          <>
                            <br />
                            First transient detected at: {firstTransientTime.toFixed(3)} seconds.
                          </>
                        )}
                        <br />
                        Use this slider to fine-tune synchronization for perfect alignment.
                      </Typography>
                    </Box>
                  )}
                  
                  <Slider
                    value={startOffset * 1000} // Convert to milliseconds for display
                    onChange={debouncedOffsetChange} // Use debounced version to prevent too many updates
                    onChangeCommitted={handleOffsetChange} // Final update when slider is released
                    min={-200}
                    max={200}
                    step={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value} ms`}
                    aria-label="Audio Start Offset"
                    disabled={isLoading || isDetectingTransient}
                    marks={[
                      { value: -200, label: '-200ms' },
                      { value: 0, label: '0' },
                      { value: 200, label: '+200ms' },
                    ]}
                    sx={{ mt: 1 }}
                  />
                  
                  {firstTransientTime !== null && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        First transient detected at: {firstTransientTime.toFixed(3)}s
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              <audio 
                ref={(audioElement) => {
                  if (audioElement) {
                    // Store the reference
                    audioRef.current = audioElement;
                    // Sync play state with component state
                    if (isPlaying && audioElement.paused) {
                      audioElement.play().catch(err => console.error('Play error:', err));
                    } else if (!isPlaying && !audioElement.paused) {
                      audioElement.pause();
                    }
                  }
                }}
                src={audioUrl ? getValidAudioUrl(audioUrl) : ''} 
                controls 
                style={{ width: '100%', display: 'none' }}
                onCanPlay={() => {
                  console.log('Audio ready');
                  setIsLoading(false);
                }}
                onError={(e) => {
                  console.error('Audio player error:', e);
                  setError('Failed to load audio file');
                  setIsLoading(false);
                }}
              />
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Upload an audio file to play
            </Typography>
          )}
        </Paper>
      </Box>

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
      
      {isDetectingTransient && (
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
            Detecting first transient...
          </Typography>
        </Box>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
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
      
      {isDetectingTransient && (
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
            Detecting first transient...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <IconButton
          onClick={isPlaying ? handleStop : handlePlay}
          color="primary"
          size="large"
          disabled={isLoading || (!audioUrl && !audioBuffer)}
        >
          {isPlaying ? <StopIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
        </IconButton>
        
        <Typography variant="body1" sx={{ ml: 1 }}>
          {isPlaying ? 'Stop' : 'Play'} {audioUrl ? '(Drums + Audio)' : '(Drums Only)'}
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
          <IconButton onClick={toggleMute} size="small">
            {audioVolume === 0 ? <VolumeMuteIcon /> : <VolumeUpIcon />}
          </IconButton>
          <Slider
            value={audioVolume * 100}
            onChange={handleVolumeChange}
            aria-labelledby="audio-volume-slider"
            min={0}
            max={100}
            sx={{ width: 100 }}
          />
        </Stack>
      </Stack>
      
      {/* Metronome integration */}
      {bpm && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Metronome</Typography>
          <Metronome 
            bpm={bpm} 
            isPlaying={isPlaying}
            onBpmChange={(newBpm) => {
              if (Tone.Transport) {
                Tone.Transport.bpm.value = newBpm;
                console.log('Updated Transport BPM to:', newBpm);
              }
            }}
          />
        </Box>
      )}
      
      {/* Audio Start Offset control moved to be under the waveform visualizer */}
    </Paper>
  );
};

export default DualPlayback;
