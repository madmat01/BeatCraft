import { useState } from 'react';
import axios from 'axios';
import { AnalysisResponse, ErrorResponse } from '../types/api';

export const useAudioAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const analyzeAudio = async (file: File, numBars: number) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('num_bars', numBars.toString());

      const response = await axios.post<AnalysisResponse>('http://localhost:8000/audio/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setAnalysis(response.data);
      console.log('Analysis successful:', response.data);
    } catch (error) {
      console.error('Error analyzing audio:', error);
      if (axios.isAxiosError<ErrorResponse>(error)) {
        // More specific error handling based on status codes
        if (error.response?.status === 400) {
          // Format error 
          setError(error.response.data.detail || 'MP3 files require ffmpeg which is not installed. Please upload a WAV file instead.');
        } else if (error.response?.status === 408 || (error.response?.data.detail && error.response.data.detail.includes('timeout'))) {
          // Timeout error
          setError('Audio analysis took too long. Try using a shorter audio file.');
        } else {
          // Generic error
          setError(error.response?.data.detail || 'Failed to analyze audio');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadMidi = async () => {
    try {
      if (!analysis) {
        throw new Error('No analysis available');
      }

      // The MIDI file path is already available in the analysis response
      if (!analysis.midi_path) {
        throw new Error('MIDI path not available');
      }

      // Encode the path for URL safety
      const encodedPath = encodeURIComponent(analysis.midi_path);
      
      const response = await axios.get(
        `http://localhost:8000/audio/download/${encodedPath}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'drum_pattern.mid');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading MIDI:', error);
      if (axios.isAxiosError<ErrorResponse>(error)) {
        setError(error.response?.data.detail || 'Failed to download MIDI file');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return {
    loading,
    error,
    analysis,
    analyzeAudio,
    downloadMidi,
    setError
  };
}; 