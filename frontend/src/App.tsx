import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Stack,
  Button,
  LinearProgress,
  Alert
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { FileUpload } from './components/FileUpload';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import DrumSequencer from './components/DrumSequencer';
import DualPlayback from './components/DualPlayback';

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



function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sequencerBpm, setSequencerBpm] = useState<number | null>(null);
  const [sequencerSwing, setSequencerSwing] = useState<number | null>(null);
  const [sequencerPattern, setSequencerPattern] = useState<boolean[][] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const drumSequencerRef = useRef<any>(null);
  const { loading, error, analysis, analyzeAudio, downloadMidi, setError } = useAudioAnalysis();

  // Update sequencer parameters when analysis is complete
  useEffect(() => {
    if (analysis) {
      setSequencerBpm(analysis.tempo);
      setSequencerSwing(analysis.swing_ratio);
      
      // Check if pattern data is available
      if (analysis.pattern && Array.isArray(analysis.pattern)) {
        setSequencerPattern(analysis.pattern);
        console.log('MIDI pattern loaded from analysis:', analysis.pattern);
      }
      
      // Create object URL for the original audio file if available
      if (file) {
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        
        // Clean up the URL when component unmounts
        return () => {
          URL.revokeObjectURL(url);
        };
      }
    }
  }, [analysis, file]);

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
          
          {sequencerBpm && sequencerSwing ? (
            <>
              <DualPlayback 
                audioUrl={audioUrl || undefined}
                bpm={sequencerBpm}
                onPlayStateChange={(playing) => {
                  setIsPlaying(playing);
                  // Coordinate with DrumSequencer
                  if (drumSequencerRef.current) {
                    if (playing) {
                      drumSequencerRef.current.startPlayback();
                    } else {
                      drumSequencerRef.current.stopPlayback();
                    }
                  }
                }}
              />
              <DrumSequencer 
                initialBpm={sequencerBpm} 
                initialSwing={sequencerSwing}
                initialPattern={sequencerPattern || undefined}
                ref={drumSequencerRef}
                externalPlayState={isPlaying}
              />
            </>
          ) : (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Drum Sequencer
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Upload and analyze an audio file to initialize the drum sequencer with the detected tempo and swing.
              </Typography>
            </Paper>
          )}

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