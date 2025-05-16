import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DrumSequencer from './DrumSequencer';
import React from 'react';
import { useDrumSequencer, UseDrumSequencerReturn } from '../hooks/useDrumSequencer';

// Mock Tone.js
vi.mock('tone', () => ({
  start: vi.fn(),
  Player: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    sync: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  })),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    bpm: { value: 120 },
    swing: 0,
  },
  Volume: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  Sampler: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnThis(),
    triggerAttack: vi.fn(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
    add: vi.fn().mockResolvedValue(undefined),
  })),
  Sequence: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    dispose: vi.fn(),
  })),
  context: {
    resume: vi.fn().mockResolvedValue(undefined),
    state: 'running',
  },
}));

// Mock the useDrumSequencer hook
vi.mock('../hooks/useDrumSequencer', () => ({
  useDrumSequencer: vi.fn(),
}));

describe('DrumSequencer', () => {
  // Create a mock return value for useDrumSequencer
  const createMockReturn = (): UseDrumSequencerReturn => ({
    isPlaying: false,
    currentStep: 0,
    bpm: 120,
    swing: 0,
    steps: Array(4).fill(Array(16).fill({ active: false, velocity: 0.75 })),
    volume: 0,
    togglePlay: vi.fn(),
    stop: vi.fn(),
    setBpm: vi.fn(),
    setSwing: vi.fn(),
    toggleStep: vi.fn(),
    setVolume: vi.fn(),
    playSound: vi.fn(),
    setPattern: vi.fn(),
    samplesLoaded: false,
    samplesError: null,
    getTransport: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      bpm: { value: 120 },
      swing: 0,
    }),
    setStepVelocity: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for useDrumSequencer
    vi.mocked(useDrumSequencer).mockImplementation(() => createMockReturn());
  });

  it('renders with default props', () => {
    render(<DrumSequencer />);
    
    // Check if the component renders
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('responds to external play state changes', async () => {
    // Mock the useDrumSequencer hook
    const mockTogglePlay = vi.fn();
    const mockStop = vi.fn();
    
    const mockReturnValue = {
      isPlaying: false,
      currentStep: 0,
      bpm: 120,
      swing: 0,
      steps: Array(4).fill(Array(16).fill({ active: false, velocity: 0.75 })),
      volume: 0,
      togglePlay: mockTogglePlay,
      stop: mockStop,
      setBpm: vi.fn(),
      setSwing: vi.fn(),
      toggleStep: vi.fn(),
      setVolume: vi.fn(),
      playSound: vi.fn(),
      setPattern: vi.fn(),
      samplesLoaded: true,
      samplesError: null,
      getTransport: vi.fn().mockReturnValue({
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        bpm: { value: 120 },
        swing: 0,
      }),
      setStepVelocity: vi.fn(),
    };
    
    vi.mocked(useDrumSequencer).mockReturnValue(mockReturnValue);
    
    // Render with external play state true
    const { rerender } = render(<DrumSequencer externalPlayState={true} />);
    
    // Check if togglePlay was called when externalPlayState is true
    await waitFor(() => {
      expect(mockTogglePlay).toHaveBeenCalled();
    });
    
    // Update mock to show playing state
    vi.mocked(useDrumSequencer).mockReturnValue({
      ...mockReturnValue,
      isPlaying: true
    });
    
    // Rerender with external play state false
    rerender(<DrumSequencer externalPlayState={false} />);
    
    // Check if stop was called when externalPlayState is false
    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
  });

  it('exposes imperative methods via ref', async () => {
    // Mock the useDrumSequencer hook with a simple implementation
    const mockTogglePlay = vi.fn().mockResolvedValue(undefined);
    const mockStop = vi.fn();

    vi.mocked(useDrumSequencer).mockReturnValue({
      isPlaying: false,
      currentStep: 0,
      bpm: 120,
      swing: 0,
      steps: Array(4).fill(Array(16).fill({ active: false, velocity: 0.75 })),
      volume: 0,
      togglePlay: mockTogglePlay,
      stop: mockStop,
      setBpm: vi.fn(),
      setSwing: vi.fn(),
      toggleStep: vi.fn(),
      setVolume: vi.fn(),
      playSound: vi.fn(),
      setPattern: vi.fn(),
      samplesLoaded: true,
      samplesError: null,
      getTransport: vi.fn().mockReturnValue({
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        bpm: { value: 120 },
        swing: 0,
      }),
      setStepVelocity: vi.fn(),
    });

    // Create and render component with ref
    const ref = React.createRef<{
      startPlayback: () => Promise<void>;
      stopPlayback: () => void;
    }>();

    render(<DrumSequencer ref={ref} />);

    // Wait for ref to be set
    await vi.waitFor(() => {
      expect(ref.current).toBeTruthy();
    });

    // Test startPlayback
    await ref.current?.startPlayback();
    await vi.waitFor(() => {
      expect(mockTogglePlay).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Update mock to show playing state
    vi.mocked(useDrumSequencer).mockReturnValue({
      ...vi.mocked(useDrumSequencer).mock.results[0].value,
      isPlaying: true
    });

    // Test stopPlayback
    ref.current?.stopPlayback();
    await vi.waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('loads initial pattern when provided', () => {
    // Mock pattern data
    const initialPattern = Array(4).fill(Array(4).fill({ active: false, velocity: 0.75 }));
    
    const setPatternMock = vi.fn();
    
    // Mock the hook to return loaded samples and the setPattern function
    vi.mocked(useDrumSequencer).mockReturnValue({
      ...createMockReturn(),
      setPattern: setPatternMock,
      samplesLoaded: true
    });
    
    // Render with initial pattern
    render(<DrumSequencer initialPattern={initialPattern} />);
    
    // Check if setPattern was called with the initial pattern
    expect(setPatternMock).toHaveBeenCalledWith(initialPattern);
  });

  it('shows loading state when samples are not loaded', () => {
    // Set samples as not loaded
    vi.mocked(useDrumSequencer).mockReturnValue({
      ...createMockReturn(),
      samplesLoaded: false
    });
    
    render(<DrumSequencer />);
    
    // Check if loading indicator is shown
    expect(screen.getByText(/loading drum samples/i)).toBeInTheDocument();
  });

  it('handles stop button click', async () => {
    // Mock the useDrumSequencer hook
    const mockStop = vi.fn();
    vi.mocked(useDrumSequencer).mockReturnValue({
      isPlaying: true,
      currentStep: 0,
      bpm: 120,
      swing: 0,
      steps: Array(4).fill(Array(16).fill({ active: false, velocity: 0.75 })),
      volume: 0,
      togglePlay: vi.fn(),
      stop: mockStop,
      setBpm: vi.fn(),
      setSwing: vi.fn(),
      toggleStep: vi.fn(),
      setVolume: vi.fn(),
      playSound: vi.fn(),
      setPattern: vi.fn(),
      samplesLoaded: true,
      samplesError: null,
      getTransport: vi.fn().mockReturnValue({
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        bpm: { value: 120 },
        swing: 0,
      }),
      setStepVelocity: vi.fn(),
    });

    // Render component
    render(<DrumSequencer />);

    // Click stop button
    const stopButton = screen.getByTestId('stop-button');
    await act(async () => {
      fireEvent.click(stopButton);
    });

    // Verify stop was called
    await vi.waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('displays error message when sample loading fails', () => {
    // Mock an error during sample loading
    vi.mocked(useDrumSequencer).mockReturnValue({
      ...createMockReturn(),
      samplesError: 'Failed to load samples'
    });

    render(<DrumSequencer />);
    
    // Check if error message is shown
    expect(screen.getByText(/failed to load samples/i)).toBeInTheDocument();
  });
});
