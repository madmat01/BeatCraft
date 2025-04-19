import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { AnalysisResponse } from '../types/api';

interface AnalysisResultsProps {
  analysis: AnalysisResponse;
  onDownload: () => void;
}

export const AnalysisResults = ({ analysis, onDownload }: AnalysisResultsProps) => {
  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Analysis Results
      </Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Tempo
          </Typography>
          <Typography variant="h4" color="primary">
            {analysis.tempo.toFixed(1)} BPM
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Swing Ratio
          </Typography>
          <Typography variant="h4" color="primary">
            {(analysis.swing_ratio * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Stack>
      <Button
        variant="contained"
        onClick={onDownload}
        startIcon={<DownloadIcon />}
        fullWidth
      >
        Download MIDI
      </Button>
    </Paper>
  );
}; 