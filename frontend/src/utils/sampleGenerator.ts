/**
 * Utility to generate basic drum samples using Web Audio API
 * This avoids relying on external sample URLs that might be blocked
 */

// Generate a kick drum sample
export const generateKickSample = async (): Promise<AudioBuffer> => {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.5; // seconds
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Create a kick drum sound (low frequency with quick decay)
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const frequency = 60 + 80 * Math.exp(-10 * t);
    const amplitude = 0.7 * Math.exp(-5 * t);
    data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
  }
  
  // Return the AudioBuffer directly
  return buffer;
};

// Generate a snare drum sample
export const generateSnareSample = async (): Promise<AudioBuffer> => {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.3; // seconds
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Create a snare drum sound (noise + mid tone)
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const noise = Math.random() * 2 - 1;
    const tone = Math.sin(2 * Math.PI * 180 * t);
    const amplitude = 0.5 * Math.exp(-10 * t);
    data[i] = amplitude * (0.7 * noise + 0.3 * tone);
  }
  
  // Return the AudioBuffer directly
  return buffer;
};

// Generate a hi-hat sample
export const generateHihatSample = async (): Promise<AudioBuffer> => {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.2; // seconds
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Create a hi-hat sound (high frequency noise with quick decay)
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const noise = Math.random() * 2 - 1;
    const amplitude = 0.3 * Math.exp(-20 * t);
    data[i] = amplitude * noise;
  }
  
  // Return the AudioBuffer directly
  return buffer;
};

// Generate a clap sample
export const generateClapSample = async (): Promise<AudioBuffer> => {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.3; // seconds
  const bufferSize = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Create a clap sound (filtered noise with a bit of delay)
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const noise = Math.random() * 2 - 1;
    let amplitude = 0;
    
    // Main hit
    if (t < 0.02) {
      amplitude = 0.5 * Math.exp(-50 * t);
    } 
    // Delayed hits (echo effect)
    else if (t >= 0.02 && t < 0.03) {
      amplitude = 0.3 * Math.exp(-50 * (t - 0.02));
    } else if (t >= 0.03 && t < 0.04) {
      amplitude = 0.2 * Math.exp(-50 * (t - 0.03));
    } else if (t >= 0.04) {
      amplitude = 0.1 * Math.exp(-20 * (t - 0.04));
    }
    
    data[i] = amplitude * noise;
  }
  
  // Return the AudioBuffer directly
  return buffer;
};

// We no longer need these helper functions since we're returning AudioBuffers directly
