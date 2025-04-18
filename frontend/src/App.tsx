import { useState } from 'react';
import { MantineProvider, Container, Title, Paper, Stack, Text } from '@mantine/core';
import { FileUpload } from './components/FileUpload';
import './App.css';

interface AnalysisResult {
  tempo: number;
  beat_times: number[];
  swing_ratio: number;
}

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
  };

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Container size="sm" py="xl">
        <Stack spacing="xl">
          <Title order={1} align="center">BeatCraft</Title>
          <Text align="center" color="dimmed">
            Upload an audio file to analyze its tempo and generate a matching MIDI drum pattern
          </Text>
          
          <Paper shadow="sm" p="xl" radius="md">
            <FileUpload onUploadComplete={handleAnalysisComplete} />
          </Paper>

          {analysisResult && (
            <Paper shadow="sm" p="xl" radius="md">
              <Stack spacing="md">
                <Title order={3}>Analysis Results</Title>
                <Text><strong>Tempo:</strong> {analysisResult.tempo.toFixed(1)} BPM</Text>
                <Text><strong>Swing Ratio:</strong> {analysisResult.swing_ratio.toFixed(3)}</Text>
                <Text><strong>Detected Beats:</strong> {analysisResult.beat_times.length}</Text>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </MantineProvider>
  );
}

export default App;
