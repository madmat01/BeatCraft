import axios from 'axios';
import { AnalysisResponse, TransientDetectionResponse } from '../types/api';
import config from '../config';

const API_URL = config.apiUrl;

/**
 * Service to handle all API calls to the backend
 */
export const apiService = {
  /**
   * Analyze an audio file to extract tempo, swing, and generate a MIDI pattern
   * @param file The audio file to analyze
   * @param numBars Optional number of bars to generate
   * @returns Promise with the analysis results
   */
  analyzeAudio: async (file: File, numBars?: number): Promise<AnalysisResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (numBars) {
      formData.append('num_bars', numBars.toString());
    }
    
    const response = await axios.post<AnalysisResponse>(
      `${API_URL}/audio/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
  
  /**
   * Detect the first transient in an audio file
   * @param file The audio file to analyze
   * @returns Promise with the first transient time in seconds
   */
  detectFirstTransient: async (file: File): Promise<TransientDetectionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post<TransientDetectionResponse>(
      `${API_URL}/audio/detect-transient`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
  
  /**
   * Get the URL for downloading a MIDI file
   * @param midiPath The path to the MIDI file on the server
   * @returns The full URL to download the MIDI file
   */
  getMidiDownloadUrl: (midiPath: string): string => {
    return `${API_URL}/audio/download/${encodeURIComponent(midiPath)}`;
  }
};

export default apiService;
