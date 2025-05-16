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

  // Create and manage audio URL when file is selected
  useEffect(() => {
    if (file) {
      console.log('Creating URL for file:', file.name);
      const url = URL.createObjectURL(file);
      console.log('Created URL:', url);
      setAudioUrl(url);

      return () => {
        console.log('Cleaning up URL:', url);
        URL.revokeObjectURL(url);
        setAudioUrl(null);
      };
    }
  }, [file]);

  // Update sequencer parameters when analysis is complete
  useEffect(() => {
    if (analysis) {
      console.log('Analysis complete, updating parameters');
      setSequencerBpm(analysis.tempo);
      setSequencerSwing(analysis.swing_ratio);
      
      // Check if pattern data is available
      if (analysis.pattern && Array.isArray(analysis.pattern)) {
        setSequencerPattern(analysis.pattern);
        console.log('MIDI pattern loaded from analysis:', analysis.pattern);
      }
    }
  }, [analysis]);

  const handleFileSelected = (selectedFile: File) => {
    console.log('File selected:', selectedFile.name);
    // Reset states
    setError(null);
    setSequencerBpm(null);
    setSequencerSwing(null);
    setSequencerPattern(null);
    // Set new file
    setFile(selectedFile);
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
              <Box sx={{ mb: 4 }}>
                {audioUrl ? (
                  <DualPlayback 
                    audioUrl={audioUrl}
                    audioFile={file || undefined}
                    bpm={sequencerBpm}
                    onPlayStateChange={(playing) => {
                      console.log('Play state changed:', playing);
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
                ) : (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="body1" color="text.secondary" align="center">
                      Upload an audio file to see the waveform visualization
                    </Typography>
                  </Paper>
                )}
              </Box>
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