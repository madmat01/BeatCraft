import React, { useState } from 'react';
import { Container, Button, Typography, Box, LinearProgress, Alert } from '@mui/material';
import { Upload, PlayArrow } from '@mui/icons-material';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    tempo?: number;
    swingRatio?: number;
    error?: string;
  }>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setAnalysisResult({});
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult({});

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/audio/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze audio');
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      setAnalysisResult({ error: 'Failed to analyze audio. Please try again.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        BeatCraft Audio Analyzer
      </Typography>

      <Box sx={{ mt: 4 }}>
        <input
          accept="audio/*"
          style={{ display: 'none' }}
          id="audio-upload"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="audio-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<Upload />}
            fullWidth
            disabled={isAnalyzing}
          >
            Upload Audio File
          </Button>
        </label>

        {file && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Selected file: {file.name}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              fullWidth
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              Analyze Audio
            </Button>
          </Box>
        )}

        {isAnalyzing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>
        )}

        {analysisResult.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {analysisResult.error}
          </Alert>
        )}

        {analysisResult.tempo && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Analysis Results:</Typography>
            <Typography variant="body1">
              Tempo: {analysisResult.tempo.toFixed(1)} BPM
            </Typography>
            <Typography variant="body1">
              Swing Ratio: {(analysisResult.swingRatio || 0.5).toFixed(2)}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default App;
