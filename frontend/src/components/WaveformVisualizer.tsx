import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import WaveSurfer from 'wavesurfer.js';

interface WaveformVisualizerProps {
  audioUrl?: string;
  isPlaying: boolean;
  onReady?: () => void;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  startOffset?: number; // Start offset in seconds
  onOffsetChange?: (offset: number) => void; // Callback when offset is changed by dragging
}

/**
 * WaveformVisualizer component for displaying audio waveforms using WaveSurfer.js
 */
const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioUrl,
  isPlaying,
  onReady,
  height = 80,
  waveColor = '#3f51b5',
  progressColor = '#f50057',
  startOffset = 0,
  onOffsetChange,
}) => {
  // Container reference for WaveSurfer
  const waveformRef = useRef<HTMLDivElement>(null);
  // Reference to WaveSurfer instance
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  // Reference to the marker element
  const markerRef = useRef<HTMLDivElement>(null);
  
  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Create and initialize WaveSurfer instance
  useEffect(() => {
    if (!waveformRef.current) return;
    
    // Clean up previous instance if it exists
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }
    
    // Create new WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      height: height,
      responsive: true,
      cursorWidth: 1,
      cursorColor: '#333',
      normalize: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });
    
    // Store the instance in the ref
    wavesurferRef.current = wavesurfer;
    
    // Event listeners
    wavesurfer.on('ready', () => {
      setIsLoading(false);
      setDuration(wavesurfer.getDuration());
      if (onReady) onReady();
      
      // Position the marker at the start offset
      updateMarkerPosition(startOffset);
    });
    
    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setError('Failed to load audio');
      setIsLoading(false);
    });
    
    wavesurfer.on('audioprocess', () => {
      if (wavesurfer.isPlaying()) {
        setCurrentTime(wavesurfer.getCurrentTime());
      }
    });
    
    wavesurfer.on('seek', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });
    
    // Load audio if URL is provided
    if (audioUrl) {
      setIsLoading(true);
      setError(null);
      wavesurfer.load(audioUrl);
    }
    
    // Cleanup on unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl, height, waveColor, progressColor, onReady, startOffset]);
  
  // Update playback state when isPlaying changes
  useEffect(() => {
    if (!wavesurferRef.current) return;
    
    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);
  
  // Update marker position when startOffset changes
  useEffect(() => {
    updateMarkerPosition(startOffset);
  }, [startOffset]);
  
  // Function to update the marker position
  const updateMarkerPosition = useCallback((offset: number) => {
    if (!wavesurferRef.current || !markerRef.current || !waveformRef.current) return;
    
    const wavesurfer = wavesurferRef.current;
    const totalDuration = wavesurfer.getDuration() || 1; // Prevent division by zero
    
    // Calculate position as percentage of total width
    const position = (offset / totalDuration) * 100;
    
    // Update marker position
    markerRef.current.style.left = `${position}%`;
  }, []);
  
  // Handle marker drag
  const handleMarkerMouseDown = useCallback((e: React.MouseEvent) => {
    if (!waveformRef.current || !wavesurferRef.current) return;
    
    e.preventDefault();
    
    const waveformElement = waveformRef.current;
    const wavesurfer = wavesurferRef.current;
    const totalDuration = wavesurfer.getDuration() || 1;
    
    const startX = e.clientX;
    const markerStartLeft = markerRef.current ? parseFloat(markerRef.current.style.left) || 0 : 0;
    
    // Calculate the width of the waveform container
    const waveformRect = waveformElement.getBoundingClientRect();
    const waveformWidth = waveformRect.width;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!markerRef.current) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / waveformWidth) * 100;
      
      // Calculate new position as percentage (clamped between 0-100%)
      const newPositionPercent = Math.max(0, Math.min(100, markerStartLeft + deltaPercent));
      
      // Update marker position
      markerRef.current.style.left = `${newPositionPercent}%`;
      
      // Calculate the new offset in seconds
      const newOffset = (newPositionPercent / 100) * totalDuration;
      
      // Call the callback with the new offset
      if (onOffsetChange) {
        onOffsetChange(newOffset);
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onOffsetChange]);
  
  // Format time (seconds to MM:SS format)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Waveform container */}
      <Box 
        sx={{ 
          width: '100%', 
          height: `${height}px`,
          position: 'relative',
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {/* Loading indicator */}
        {isLoading && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 10,
              bgcolor: 'rgba(255, 255, 255, 0.5)'
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
        
        {/* Error message */}
        {error && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 10,
              color: 'error.main'
            }}
          >
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
        
        {/* WaveSurfer container */}
        <div ref={waveformRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Offset marker */}
        <Box 
          ref={markerRef}
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: '0%', // Will be updated by code
            width: '2px', 
            height: '100%', 
            bgcolor: '#ffffff',
            zIndex: 5,
            cursor: 'col-resize',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-4px',
              width: '10px',
              height: '100%',
              opacity: 0.3,
            },
            '&::after': {
              content: '"Offset"',
              position: 'absolute',
              top: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: '#fff',
              textShadow: '0 0 2px #000',
              whiteSpace: 'nowrap',
            }
          }}
          onMouseDown={handleMarkerMouseDown}
        />
      </Box>
      
      {/* Time indicators */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {formatTime(currentTime)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatTime(duration)}
        </Typography>
      </Box>
    </Box>
  );
};

export default WaveformVisualizer;
