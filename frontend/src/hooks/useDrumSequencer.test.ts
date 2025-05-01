import { renderHook, act } from '@testing-library/react';
import { useDrumSequencer } from './useDrumSequencer';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Tone from 'tone';

// Mock Tone.js
vi.mock('tone', () => {
  return {
    start: vi.fn(),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      bpm: { value: 120 },
      swing: 0,
      position: '0:0:0',
      schedule: vi.fn(),
    },
    Sampler: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      add: vi.fn().mockResolvedValue(undefined),
    })),
    Volume: vi.fn().mockImplementation(() => ({
      toDestination: vi.fn().mockReturnThis(),
    })),
    Sequence: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    })),
  };
});

// Mock the sample generator
vi.mock('../utils/sampleGenerator', () => ({
  generateKickSample: vi.fn().mockResolvedValue(new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 })),
  generateSnareSample: vi.fn().mockResolvedValue(new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 })),
  generateHihatSample: vi.fn().mockResolvedValue(new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 })),
  generateClapSample: vi.fn().mockResolvedValue(new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 })),
}));

describe('useDrumSequencer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    expect(result.current.bpm).toBe(120);
    expect(result.current.swing).toBe(0);
    expect(result.current.steps).toBeDefined();
    expect(result.current.steps.length).toBe(4); // 4 drum sounds
    expect(result.current.steps[0].length).toBe(16); // 16 steps
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.volume).toBe(0);
  });

  it('should update BPM when setBpm is called', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    act(() => {
      result.current.setBpm(140);
    });
    
    expect(result.current.bpm).toBe(140);
    expect(Tone.Transport.bpm.value).toBe(140);
  });

  it('should update swing when setSwing is called', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    act(() => {
      result.current.setSwing(0.3);
    });
    
    expect(result.current.swing).toBe(0.3);
    expect(Tone.Transport.swing).toBe(0.3);
  });

  it('should update volume when setVolume is called', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    act(() => {
      result.current.setVolume(-10);
    });
    
    expect(result.current.volume).toBe(-10);
  });

  it('should toggle playback state when togglePlay is called', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    // Initially not playing
    expect(result.current.isPlaying).toBe(false);
    
    // Start playing
    act(() => {
      result.current.togglePlay();
    });
    
    expect(result.current.isPlaying).toBe(true);
    expect(Tone.start).toHaveBeenCalled();
    expect(Tone.Transport.start).toHaveBeenCalled();
    
    // Stop playing
    act(() => {
      result.current.togglePlay();
    });
    
    expect(result.current.isPlaying).toBe(false);
    expect(Tone.Transport.stop).toHaveBeenCalled();
  });

  it('should toggle step', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    // Initial state - all steps are false
    const initialStep = result.current.steps[0][0];
    expect(initialStep).toBe(false);
    
    // Toggle a step
    act(() => {
      result.current.toggleStep(0, 0);
    });
    
    // Check if the step was toggled
    expect(result.current.steps[0][0]).toBe(true);
    
    // Toggle it back
    act(() => {
      result.current.toggleStep(0, 0);
    });
    
    expect(result.current.steps[0][0]).toBe(false);
  });
  
  it('should set pattern from external data', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    // Create a test pattern
    const testPattern = [
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
      [true, true, false, false, true, true, false, false, true, true, false, false, true, true, false, false],
      [false, false, true, true, false, false, true, true, false, false, true, true, false, false, true, true]
    ];
    
    // Initial state: all steps should be false
    expect(result.current.steps.every(row => row.every(step => step === false))).toBe(true);
    
    // Set the pattern
    act(() => {
      result.current.setPattern(testPattern);
    });
    
    // Steps should now match the test pattern
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 16; j++) {
        expect(result.current.steps[i][j]).toBe(testPattern[i][j]);
      }
    }
  });
  
  it('should handle invalid pattern data', () => {
    const { result } = renderHook(() => useDrumSequencer());
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create an invalid pattern (wrong number of rows)
    const invalidPattern = [
      [true, false, true, false],
      [false, true, false, true],
      [true, true, false, false]
      // Missing fourth row
    ];
    
    // Initial state: all steps should be false
    const initialSteps = JSON.parse(JSON.stringify(result.current.steps));
    
    // Try to set the invalid pattern
    act(() => {
      // @ts-ignore - Testing invalid input
      result.current.setPattern(invalidPattern);
    });
    
    // Steps should remain unchanged
    expect(result.current.steps).toEqual(initialSteps);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
  
  it('should provide access to Tone.Transport', () => {
    const { result } = renderHook(() => useDrumSequencer());
    
    // Check that getTransport returns the Tone.Transport object
    expect(result.current.getTransport).toBeDefined();
    const transport = result.current.getTransport();
    expect(transport).toBe(Tone.Transport);
  });
});
