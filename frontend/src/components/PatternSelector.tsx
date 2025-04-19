import React, { useState } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Slider, 
  Typography, 
  SelectChangeEvent, 
  Button,
  Stack,
  Paper
} from '@mui/material';
import { PatternType, MidiGenerationOptions } from '../types/api';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

interface PatternSelectorProps {
  onGenerate: (options: MidiGenerationOptions) => void;
  initialSwingRatio?: number;
  isLoading: boolean;
}

export const PatternSelector: React.FC<PatternSelectorProps> = ({ 
  onGenerate, 
  initialSwingRatio = 0.5,
  isLoading
}) => {
  const [patternType, setPatternType] = useState<PatternType>(PatternType.BASIC);
  const [velocity, setVelocity] = useState<number>(100);
  const [swingRatio, setSwingRatio] = useState<number>(initialSwingRatio);

  const handlePatternTypeChange = (event: SelectChangeEvent) => {
    setPatternType(event.target.value as PatternType);
  };

  const handleVelocityChange = (_: Event, newValue: number | number[]) => {
    setVelocity(newValue as number);
  };

  const handleSwingRatioChange = (_: Event, newValue: number | number[]) => {
    setSwingRatio(newValue as number);
  };

  const handleGenerateClick = () => {
    onGenerate({
      pattern_type: patternType,
      velocity,
      swing_ratio: swingRatio
    });
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        MIDI Pattern Options
      </Typography>
      
      <Stack spacing={3}>
        <Box width="100%">
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="pattern-type-label">Pattern Type</InputLabel>
            <Select
              labelId="pattern-type-label"
              id="pattern-type"
              value={patternType}
              label="Pattern Type"
              onChange={handlePatternTypeChange}
            >
              <MenuItem value={PatternType.BASIC}>Basic (Kick & Snare)</MenuItem>
              <MenuItem value={PatternType.HIHAT}>Hi-Hat (Basic + Hi-Hats)</MenuItem>
              <MenuItem value={PatternType.FULL}>Full (Complete Drum Kit)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Box width="100%">
          <Typography id="velocity-slider" gutterBottom>
            Velocity (Volume)
          </Typography>
          <Slider
            value={velocity}
            onChange={handleVelocityChange}
            aria-labelledby="velocity-slider"
            valueLabelDisplay="auto"
            min={1}
            max={127}
          />
        </Box>
        
        <Box width="100%">
          <Typography id="swing-ratio-slider" gutterBottom>
            Swing Ratio: {(swingRatio * 100).toFixed(1)}%
          </Typography>
          <Slider
            value={swingRatio}
            onChange={handleSwingRatioChange}
            aria-labelledby="swing-ratio-slider"
            valueLabelDisplay="auto"
            min={0.5}
            max={0.75}
            step={0.01}
          />
        </Box>
        
        <Button
          variant="contained"
          color="secondary"
          onClick={handleGenerateClick}
          startIcon={<MusicNoteIcon />}
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate & Download MIDI'}
        </Button>
      </Stack>
    </Paper>
  );
}; 