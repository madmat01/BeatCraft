import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WaveformVisualizer from './WaveformVisualizer';

// Mock WaveSurfer
jest.mock('wavesurfer.js', () => {
  return {
    __esModule: true,
    default: {
      create: () => ({
        on: jest.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(callback, 0);
          }
        }),
        load: jest.fn(),
        play: jest.fn(),
        pause: jest.fn(),
        destroy: jest.fn(),
        getDuration: () => 100,
        getCurrentTime: () => 0,
        isPlaying: () => false,
      }),
    },
  };
});

describe('WaveformVisualizer', () => {
  const mockOnReady = jest.fn();
  const mockOnOffsetChange = jest.fn();
  const defaultProps = {
    audioUrl: 'test-audio.mp3',
    isPlaying: false,
    onReady: mockOnReady,
    height: 80,
    waveColor: '#3f51b5',
    progressColor: '#f50057',
    startOffset: 0,
    onOffsetChange: mockOnOffsetChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<WaveformVisualizer {...defaultProps} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<WaveformVisualizer {...defaultProps} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls onReady when audio is loaded', async () => {
    render(<WaveformVisualizer {...defaultProps} />);
    await waitFor(() => {
      expect(mockOnReady).toHaveBeenCalled();
    });
  });

  it('updates marker position when startOffset changes', async () => {
    const { rerender } = render(<WaveformVisualizer {...defaultProps} />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(mockOnReady).toHaveBeenCalled();
    });

    // Update with new offset
    rerender(<WaveformVisualizer {...defaultProps} startOffset={10} />);
    
    // Verify marker style is updated (position should be 10% of total duration)
    const marker = screen.getByRole('slider');
    expect(marker).toHaveStyle({ left: '10%' });
  });

  it('handles marker drag events', async () => {
    render(<WaveformVisualizer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockOnReady).toHaveBeenCalled();
    });

    const marker = screen.getByRole('slider');
    
    // Simulate drag start
    fireEvent.mouseDown(marker, { clientX: 0 });
    
    // Simulate drag movement
    fireEvent.mouseMove(document, { clientX: 50 });
    
    // Simulate drag end
    fireEvent.mouseUp(document);
    
    // Verify offset change callback was called
    expect(mockOnOffsetChange).toHaveBeenCalled();
  });

  it('displays time indicators correctly', async () => {
    render(<WaveformVisualizer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockOnReady).toHaveBeenCalled();
    });

    // Check if both current time and duration are displayed
    expect(screen.getByText('0:00')).toBeInTheDocument(); // Current time
    expect(screen.getByText('1:40')).toBeInTheDocument(); // Duration (100 seconds)
  });
});
