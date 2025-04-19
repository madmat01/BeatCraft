import { useDropzone } from 'react-dropzone';
import { Box, Paper, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

export const FileUpload = ({ onFileSelected }: FileUploadProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': ['.wav', '.mp3']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    }
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: isDragActive ? 'action.hover' : 'background.paper',
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'divider',
        mb: 4,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover'
        }
      }}
    >
      <input {...getInputProps()} />
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop the audio file here' : 'Drag and drop an audio file here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to select a file
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          Supported formats: WAV, MP3
        </Typography>
      </Box>
    </Paper>
  );
}; 