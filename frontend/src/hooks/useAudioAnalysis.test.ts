import { renderHook } from '@testing-library/react';
import axios from 'axios';
import { useAudioAnalysis } from './useAudioAnalysis';
import { describe, it, expect, beforeEach, vi } from 'vitest';

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
    // Mock successful response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        tempo: 120,
        swing_ratio: 0.5,
        midi_path: '/path/to/midi.mid'
      }
    });

    const { result } = renderHook(() => useAudioAnalysis());
    
    // Create a mock file
    const file = new File(['dummy content'], 'audio.wav', { type: 'audio/wav' });
    
    // Call the analyze function
    await result.current.analyzeAudio(file, 4);
    
    // Check if axios.post was called
    expect(axios.post).toHaveBeenCalled();
    
    // Check if analysis state was updated
    expect(result.current.analysis).toEqual({
      tempo: 120,
      swing_ratio: 0.5,
      midi_path: '/path/to/midi.mid'
    });
  });

  it('should prepare correct URL for MIDI download', async () => {
    // Mock successful response
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: new Blob(['midi data'], { type: 'audio/midi' })
    });

    // Create a spy for URL.createObjectURL
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'mock-url');
    
    // Create a spy for document.createElement to avoid actual DOM manipulation
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
      return {
        href: '',
        setAttribute: vi.fn(),
        click: vi.fn(),
        remove: vi.fn()
      } as unknown as HTMLAnchorElement;
    });

    const { result } = renderHook(() => useAudioAnalysis());
    
    // We need to mock the analysis state since we can't directly set it
    // First, analyze with a mock response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        tempo: 120,
        swing_ratio: 0.5,
        midi_path: '/path/to/midi.mid'
      }
    });
    
    // Create a mock file and analyze it to set the state
    const file = new File(['dummy content'], 'audio.wav', { type: 'audio/wav' });
    await result.current.analyzeAudio(file, 4);
    
    // Call the download function
    await result.current.downloadMidi();
    
    // Check if axios.get was called with correct parameters
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8000/audio/download/%2Fpath%2Fto%2Fmidi.mid',
      { responseType: 'blob' }
    );
    
    // Clean up spies
    createObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});
