import { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  IconButton,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Stack,
  Button,
  LinearProgress,
  Alert
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { FileUpload } from './components/FileUpload';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// Define drum sounds
const DRUM_SOUNDS = [
  { name: 'Kick', color: '#f48fb1' },
  { name: 'Snare', color: '#90caf9' },
  { name: 'Hi-Hat', color: '#81c784' },
  { name: 'Clap', color: '#ffb74d' },
];

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<boolean[][]>(
    Array(DRUM_SOUNDS.length).fill(null).map(() => Array(16).fill(false))
  );
  const [file, setFile] = useState<File | null>(null);
  const { loading, error, analysis, analyzeAudio, downloadMidi, setError } = useAudioAnalysis();

  const toggleStep = (soundIndex: number, stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[soundIndex][stepIndex] = !newSteps[soundIndex][stepIndex];
    setSteps(newSteps);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    // TODO: Implement actual audio playback
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    await analyzeAudio(file, 4); // Using 4 bars as default
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
            <MusicNoteIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h3" component="h1">
              BeatCraft
            </Typography>
          </Stack>
          
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton 
                  onClick={isPlaying ? handleStop : handlePlay}
                  color="primary"
                  size="large"
                >
                  {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Typography variant="h6">
                  {isPlaying ? 'Stop' : 'Play'}
                </Typography>
              </Stack>
            </Box>
            
            {DRUM_SOUNDS.map((sound, soundIndex) => (
              <Box key={sound.name} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      width: 100,
                      color: sound.color 
                    }}
                  >
                    {sound.name}
                  </Typography>
                  {Array(16).fill(null).map((_, stepIndex) => (
                    <Box
                      key={stepIndex}
                      onClick={() => toggleStep(soundIndex, stepIndex)}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: steps[soundIndex][stepIndex] 
                          ? sound.color 
                          : 'background.paper',
                        border: '1px solid',
                        borderColor: currentStep === stepIndex && isPlaying
                          ? 'primary.main'
                          : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: steps[soundIndex][stepIndex]
                            ? `${sound.color}dd`
                            : 'action.hover'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Paper>

          <Typography variant="h5" gutterBottom>
            Upload Audio to Analyze
          </Typography>
          <FileUpload onFileSelected={handleFileSelected} />
          
          {file && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                fullWidth
                size="large"
              >
                {loading ? 'Analyzing...' : 'Analyze Audio'}
              </Button>
              
              {loading && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress />
                </Box>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              
              {analysis && (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Analysis complete! Tempo: {analysis.tempo.toFixed(1)} BPM, Swing: {(analysis.swing_ratio * 100).toFixed(1)}%
                  </Alert>
                  <Button
                    variant="outlined"
                    onClick={() => downloadMidi()}
                    fullWidth
                    size="large"
                    sx={{ mb: 2 }}
                  >
                    Download MIDI Pattern
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App; 