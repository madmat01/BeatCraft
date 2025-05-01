import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DualPlayback } from './DualPlayback';
import * as Tone from 'tone';

// Mock Tone.js
vi.mock('tone', () => {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
    },
    Player: vi.fn().mockImplementation(() => ({
      toDestination: vi.fn().mockReturnThis(),
      sync: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      volume: {
        value: 0
      }
    })),
    Buffer: {
      fromUrl: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue(new AudioBuffer({
          length: 1,
          sampleRate: 44100
        }))
      })
    },
    gainToDb: vi.fn().mockReturnValue(-10)
  };
});

// Mock AudioContext and AudioBuffer
global.AudioContext = vi.fn().mockImplementation(() => ({
  decodeAudioData: vi.fn().mockResolvedValue({})
}));

describe('DualPlayback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<DualPlayback />);
    
    // Check if basic elements are rendered
    expect(screen.getByText('Dual Playback')).toBeInTheDocument();
    expect(screen.getByText(/play .drums only./i)).toBeInTheDocument();
    
    // Check that the play button is rendered
    const playButton = screen.getByRole('button');
    expect(playButton).toBeInTheDocument();
    
    // Volume control should not be visible without audio URL
    expect(screen.queryByLabelText(/audio volume/i)).not.toBeInTheDocument();
  });

  it('shows loading state when loading audio', async () => {
    // Mock a pending promise to simulate loading
    vi.mocked(Tone.Buffer.fromUrl).mockReturnValueOnce(
      new Promise(() => {}) as any
    );

    render(<DualPlayback audioUrl="test.mp3" />);
    
    // Check if loading message is shown
    expect(screen.getByText(/loading audio file/i)).toBeInTheDocument();
    
    // Check that the loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Button should be disabled during loading
    const playButton = screen.getByRole('button');
    expect(playButton).toBeDisabled();
  });

  it('handles play button click and synchronizes audio with transport', async () => {
    // Mock the Tone context state
    vi.spyOn(Tone.context, 'state', 'get').mockReturnValue('running');
    
    // Mock the Tone.Buffer.fromUrl to resolve immediately
    vi.mocked(Tone.Buffer.fromUrl).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(new AudioBuffer({
        length: 1,
        sampleRate: 44100
      })),
      duration: 10
    } as any);
    
    // Create a mock for onPlayStateChange
    const onPlayStateChangeMock = vi.fn();
    
    render(<DualPlayback audioUrl="test.mp3" bpm={120} onPlayStateChange={onPlayStateChangeMock} />);
    
    // Wait for the audio to load
    await waitFor(() => expect(screen.queryByText(/loading audio file/i)).not.toBeInTheDocument());
    
    // Find and click the play button
    const playButton = screen.getByRole('button');
    fireEvent.click(playButton);
    
    // Check if Tone.start and Transport.start were called
    expect(Tone.start).toHaveBeenCalled();
    expect(Tone.Transport.start).toHaveBeenCalled();
    
    // Check if Player was created and started with sync
    expect(Tone.Player).toHaveBeenCalled();
    const mockPlayerInstance = vi.mocked(Tone.Player).mock.instances[0];
    expect(mockPlayerInstance.sync).toHaveBeenCalled();
    
    // Check if onPlayStateChange was called with true
    expect(onPlayStateChangeMock).toHaveBeenCalledWith(true);
  });

  it('handles stop button click', async () => {
    render(<DualPlayback audioUrl="test.mp3" />);
    
    // Click play first
    const playButton = screen.getByRole('button');
    fireEvent.click(playButton);
    
    // Now the button should be a stop button
    const stopButton = screen.getByRole('button');
    fireEvent.click(stopButton);
    
    // Check if Transport.stop was called
    expect(Tone.Transport.stop).toHaveBeenCalled();
  });

  it('handles volume change', async () => {
    // Mock the Tone.Buffer.fromUrl to resolve immediately
    vi.mocked(Tone.Buffer.fromUrl).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(new AudioBuffer({
        length: 1,
        sampleRate: 44100
      }))
    } as any);
    
    render(<DualPlayback audioUrl="test.mp3" />);
    
    // Wait for the audio to load
    await screen.findByLabelText(/audio volume/i);
    
    // Click play to create the player
    const playButton = screen.getByRole('button');
    fireEvent.click(playButton);
    
    // Find and change the volume slider
    const volumeSlider = screen.getByLabelText(/audio volume/i);
    fireEvent.change(volumeSlider, { target: { value: 0.5 } });
    
    // Check if gainToDb was called with the new value
    expect(Tone.gainToDb).toHaveBeenCalledWith(0.5);
  });

  it('shows error message when audio loading fails', async () => {
    // Mock an error during loading
    const errorMessage = 'Failed to load audio';
    vi.mocked(Tone.Buffer.fromUrl).mockRejectedValueOnce(new Error(errorMessage));
    
    render(<DualPlayback audioUrl="test.mp3" />);
    
    // Wait for the error to appear
    const errorElement = await screen.findByText(/failed to load audio file/i);
    expect(errorElement).toBeInTheDocument();
    
    // Button should still be enabled even with error
    const playButton = screen.getByRole('button');
    expect(playButton).not.toBeDisabled();
  });
  
  it('updates BPM when prop changes', () => {
    render(<DualPlayback bpm={140} />);
    
    // Check if Tone.Transport.bpm.value was updated
    expect(Tone.Transport.bpm).toEqual({ value: 140 });
    
    // Update props
    render(<DualPlayback bpm={160} />);
    
    // Check if BPM was updated
    expect(Tone.Transport.bpm).toEqual({ value: 160 });
  });
  
  it('coordinates with external components via onPlayStateChange', async () => {
    // Mock the Tone.Buffer.fromUrl to resolve immediately
    vi.mocked(Tone.Buffer.fromUrl).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(new AudioBuffer({
        length: 1,
        sampleRate: 44100
      })),
      duration: 10
    } as any);
    
    // Create a mock for onPlayStateChange
    const onPlayStateChangeMock = vi.fn();
    
    render(<DualPlayback audioUrl="test.mp3" bpm={120} onPlayStateChange={onPlayStateChangeMock} />);
    
    // Wait for the audio to load
    await waitFor(() => expect(screen.queryByText(/loading audio file/i)).not.toBeInTheDocument());
    
    // Find and click the play button
    const playButton = screen.getByRole('button');
    fireEvent.click(playButton);
    
    // Check if onPlayStateChange was called with true
    expect(onPlayStateChangeMock).toHaveBeenCalledWith(true);
    
    // Click again to stop
    fireEvent.click(playButton);
    
    // Check if onPlayStateChange was called with false
    expect(onPlayStateChangeMock).toHaveBeenCalledWith(false);
  });
});
