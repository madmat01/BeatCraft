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

      const response = await axios.post<AnalysisResponse>('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setAnalysis(response.data);
    } catch (error) {
      if (axios.isAxiosError<ErrorResponse>(error)) {
        setError(error.response?.data.detail || 'Failed to analyze audio');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadMidi = async (midiPath: string) => {
    try {
      const response = await axios.get(
        `/api/download/${encodeURIComponent(midiPath)}`,
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