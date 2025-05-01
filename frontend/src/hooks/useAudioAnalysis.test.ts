import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useAudioAnalysis } from './useAudioAnalysis';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { API_URLS } from '../config';

// Mock global URL and document objects
beforeAll(() => {
  // Mock URL.createObjectURL
  global.URL = {
    createObjectURL: vi.fn(() => 'mock-blob-url'),
    revokeObjectURL: vi.fn(),
  } as unknown as typeof global.URL;
  
  // Mock document.createElement
  global.document.createElement = vi.fn().mockImplementation((tag) => {
    if (tag === 'a') {
      return {
        href: '',
        setAttribute: vi.fn(),
        click: vi.fn(),
        remove: vi.fn()
      } as unknown as HTMLAnchorElement;
    }
    return document.createElement(tag);
  });
});

// Mock axios
vi.mock('axios');

describe('useAudioAnalysis', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    
    // Mock axios methods
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.get).mockReset();
  });

  it('should analyze audio successfully', async () => {
    // Mock successful response with pattern data
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        tempo: 120,
        swing_ratio: 0.5,
        midi_path: '/path/to/midi.mid',
        pattern: [
          [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
          [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
          [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
          [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
        ]
      }
    });

    const { result } = renderHook(() => useAudioAnalysis());
    
    // Create a mock file
    const file = new File(['dummy content'], 'audio.wav', { type: 'audio/wav' });
    
    // Call the analyze function
    await act(async () => {
      await result.current.analyzeAudio(file, 4);
    });
    
    // Check if axios.post was called
    expect(axios.post).toHaveBeenCalled();
    
    // Check if analysis state was updated
    expect(result.current.analysis).toEqual({
      tempo: 120,
      swing_ratio: 0.5,
      midi_path: '/path/to/midi.mid',
      pattern: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      ]
    });
  });

  it('should prepare correct URL for MIDI download', async () => {
    // Mock successful response
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: new Blob(['midi data'], { type: 'audio/midi' })
    });

    // Create spies for our already mocked global functions
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    const createElementSpy = vi.spyOn(document, 'createElement');

    const { result } = renderHook(() => useAudioAnalysis());
    
    // We need to mock the analysis state since we can't directly set it
    // First, analyze with a mock response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        tempo: 120,
        swing_ratio: 0.5,
        midi_path: '/path/to/midi.mid',
        pattern: [
          [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
          [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
          [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
          [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
        ]
      }
    });
    
    // Create a mock file and analyze it to set the state
    const file = new File(['dummy content'], 'audio.wav', { type: 'audio/wav' });
    await act(async () => {
      await result.current.analyzeAudio(file, 4);
    });
    
    // Call the download function
    await act(async () => {
      await result.current.downloadMidi();
    });
    
    // Check if axios.get was called with correct parameters
    expect(axios.get).toHaveBeenCalledWith(
      API_URLS.DOWNLOAD_MIDI('/path/to/midi.mid'),
      { responseType: 'blob' }
    );
    
    // Clean up spies
    createObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});
