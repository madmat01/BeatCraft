// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // Production API path (relative to frontend)
  : 'http://localhost:8000'; // Development API URL

export const API_URLS = {
  // Audio analysis endpoints
  ANALYZE_AUDIO: `${API_BASE_URL}/audio/analyze`,
  DOWNLOAD_MIDI: (midiPath: string) => `${API_BASE_URL}/audio/download/${encodeURIComponent(midiPath)}`,
  DETECT_TRANSIENT: `${API_BASE_URL}/audio/detect-transient`,
};

export const config = {
  apiUrl: API_BASE_URL,
  API_URLS,
};

export default config;
