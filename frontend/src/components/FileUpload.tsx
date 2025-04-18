import { useState, useRef } from 'react';
import { Button, Text, Group, Stack, Progress, Alert } from '@mantine/core';
import axios from 'axios';

interface FileUploadProps {
  onUploadComplete: (analysisResult: any) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an audio file');
        setSelectedFile(null);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:8000/audio/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      onUploadComplete(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateMidi = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:8000/audio/analyze/midi', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      // Create a download link for the MIDI file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'drum_pattern.mid');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred generating MIDI');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  return (
    <Stack spacing="md" style={{ maxWidth: 400, margin: '0 auto' }}>
      <input
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        ref={fileInputRef}
      />
      
      <Group position="center">
        <Button onClick={handleUploadClick} size="lg">
          Select Audio File
        </Button>
      </Group>

      {selectedFile && (
        <Text align="center" size="sm">
          Selected file: {selectedFile.name}
        </Text>
      )}

      {uploadProgress > 0 && (
        <Progress
          value={uploadProgress}
          label={`${uploadProgress}%`}
          size="xl"
          radius="xl"
        />
      )}

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {selectedFile && (
        <Group position="center" spacing="sm">
          <Button
            onClick={handleAnalyze}
            loading={isAnalyzing}
            disabled={!selectedFile}
          >
            Analyze Audio
          </Button>
          <Button
            onClick={handleGenerateMidi}
            loading={isAnalyzing}
            disabled={!selectedFile}
            variant="outline"
          >
            Generate MIDI
          </Button>
        </Group>
      )}
    </Stack>
  );
}
