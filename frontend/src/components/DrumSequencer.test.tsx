import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    steps: [
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    ],
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
    
    vi.mocked(useDrumSequencer).mockReturnValue({
      isPlaying: false,
      currentStep: 0,
      bpm: 120,
      swing: 0,
      steps: [
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      ],
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
    });
    
    // Render with external play state
    render(<DrumSequencer externalPlayState={true} />);
    
    // Check if togglePlay was called when externalPlayState is true
    await waitFor(() => {
      expect(mockTogglePlay).toHaveBeenCalled();
    });
    
    // Update with external play state false
    render(<DrumSequencer externalPlayState={false} />);
    
    // Check if stop was called when externalPlayState is false
    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
  });

  it('exposes imperative methods via ref', async () => {
    // Mock the useDrumSequencer hook
    const mockTogglePlay = vi.fn();
    const mockStop = vi.fn();
    
    vi.mocked(useDrumSequencer).mockReturnValue({
      isPlaying: false,
      currentStep: 0,
      bpm: 120,
      swing: 0,
      steps: [
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      ],
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
    });
    
    // Create a ref
    const ref = React.createRef<{
      startPlayback: () => void;
      stopPlayback: () => void;
    }>();
    
    // Render with ref
    render(<DrumSequencer ref={ref} />);
    
    // Call the imperative methods
    ref.current?.startPlayback();
    expect(mockTogglePlay).toHaveBeenCalled();
    
    ref.current?.stopPlayback();
    expect(mockStop).toHaveBeenCalled();
  });

  it('loads initial pattern when provided', () => {
    // Mock pattern data
    const initialPattern = [
      [true, false, true, false],
      [false, true, false, true],
      [true, true, false, false],
      [false, false, true, true],
    ];
    
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
    const mockStop = vi.fn();
    
    // Mock the hook with our spy function
    vi.mocked(useDrumSequencer).mockReturnValue({
      ...createMockReturn(),
      stop: mockStop,
      isPlaying: true
    });
    
    const { getByTestId } = render(<DrumSequencer />);
    
    // Click the stop button
    fireEvent.click(getByTestId('stop-button'));
    
    // Check if stop was called
    await vi.waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
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
