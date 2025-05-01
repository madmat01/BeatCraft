import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { generateKickSample, generateSnareSample, generateHihatSample, generateClapSample } from '../utils/sampleGenerator';

// Define drum sound types
export type DrumSoundType = 'kick' | 'snare' | 'hihat' | 'clap';

// Define drum kit samples
export interface DrumKit {
  kick: string;
  snare: string;
  hihat: string;
  clap: string;
}

// We'll generate samples on the fly instead of using URLs
// This avoids issues with external resources being blocked

// Define a step with velocity property
export interface DrumStep {
  active: boolean;
  velocity: number; // 0-1 range
}

// Interface for the drum sequencer state
export interface DrumSequencerState {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  swing: number;
  steps: DrumStep[][];
  volume: number;
}

// Interface for the drum sequencer hook return value
export interface UseDrumSequencerReturn extends DrumSequencerState {
  togglePlay: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  toggleStep: (soundIndex: number, stepIndex: number) => void;
  setStepVelocity: (soundIndex: number, stepIndex: number, velocity: number) => void;
  setVolume: (volume: number) => void;
  playSound: (soundType: DrumSoundType, velocity?: number) => void;
  setPattern: (pattern: boolean[][] | DrumStep[][]) => void;
  samplesLoaded: boolean;
  samplesError: string | null;
  getTransport: () => typeof Tone.Transport;
}

export const useDrumSequencer = (
  initialBpm = 120,
  initialSwing = 0,
  stepsPerBeat = 4,
  totalBeats = 4
): UseDrumSequencerReturn => {
  // State for the sequencer
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(initialBpm);
  const [swing, setSwing] = useState(initialSwing);
  const [volume, setVolume] = useState(0); // 0dB is default (no gain/attenuation)
  
  // Create a grid of steps (rows for each drum sound, columns for steps)
  const [steps, setSteps] = useState<DrumStep[][]>(() => {
    // 4 drum sounds (kick, snare, hihat, clap)
    const drumSounds = 4;
    // Total steps in the pattern
    const totalSteps = stepsPerBeat * totalBeats;
    
    // Initialize with all steps off and default velocity
    return Array(drumSounds).fill(null).map(() => 
      Array(totalSteps).fill(null).map(() => ({
        active: false,
        velocity: 0.7 // Default velocity (70%)
      }))
    );
  });
  
  // Refs for Tone.js objects
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const volumeNodeRef = useRef<Tone.Volume | null>(null);
  
  // State to track if samples are loaded
  const [samplesLoaded, setSamplesLoaded] = useState(false);
  const [samplesError, setSamplesError] = useState<string | null>(null);

  // Initialize Tone.js context once on mount
  useEffect(() => {
    // Initialize Tone.js context but don't start it yet
    const initTone = async () => {
      try {
        // Just create the context but don't start it
        if (Tone.context.state === 'suspended') {
          console.log('Tone.js context initialized in useDrumSequencer, waiting for user interaction');
        }
      } catch (err) {
        console.error('Error initializing Tone.js context:', err);
      }
    };
    
    initTone();
  }, []);

  // Initialize Tone.js with generated samples
  useEffect(() => {
    // Start by creating a volume node for master control
    const volumeNode = new Tone.Volume(volume).toDestination();
    volumeNodeRef.current = volumeNode;
    
    // Set loading state
    setSamplesLoaded(false);
    setSamplesError(null);
    
    // Create a sampler
    const sampler = new Tone.Sampler({
      onload: () => {
        console.log('Drum samples loaded successfully');
        setSamplesLoaded(true);
        setSamplesError(null);
      },
      onerror: (error) => {
        console.error('Error loading drum samples:', error);
        setSamplesError('Failed to load drum samples');
      },
    }).connect(volumeNode);
    
    // Generate and load samples
    const loadSamples = async () => {
      try {
        // Generate all samples in parallel
        const [kickBuffer, snareBuffer, hihatBuffer, clapBuffer] = await Promise.all([
          generateKickSample(),
          generateSnareSample(),
          generateHihatSample(),
          generateClapSample()
        ]);
        
        // Add samples to the sampler
        await sampler.add('C2', kickBuffer);
        await sampler.add('D2', snareBuffer);
        await sampler.add('F2', hihatBuffer);
        await sampler.add('G2', clapBuffer);
        
        console.log('All samples generated and loaded');
        setSamplesLoaded(true);
      } catch (error) {
        console.error('Error generating samples:', error);
        setSamplesError('Failed to generate drum samples');
      }
    };
    
    // Store the sampler in the ref
    samplerRef.current = sampler;
    
    // Load the samples
    loadSamples();
    
    // Set up Tone.js transport
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.swing = swing;
    
    // Cleanup function
    return () => {
      if (samplerRef.current) {
        samplerRef.current.dispose();
        samplerRef.current = null;
      }
      
      if (volumeNodeRef.current) {
        volumeNodeRef.current.dispose();
        volumeNodeRef.current = null;
      }
    };
  }, []);
  
  // Update BPM when it changes
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);
  
  // Update swing when it changes
  useEffect(() => {
    Tone.Transport.swing = swing;
  }, [swing]);
  
  // Update volume when it changes
  useEffect(() => {
    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.value = volume;
    }
  }, [volume]);
  
  // Create or update the sequence when steps change or samples load
  useEffect(() => {
    // Only create sequence if samples are loaded
    if (!samplesLoaded) return;
    
    // Clean up any existing sequence
    if (sequenceRef.current) {
      sequenceRef.current.dispose();
    }
    
    // Map of sound indices to notes
    const soundMap = ['C2', 'D2', 'F2', 'G2'];
    
    // Create a new sequence
    sequenceRef.current = new Tone.Sequence(
      (time, index) => {
        // Update the current step
        setCurrentStep(index);
        
        // Play sounds for this step
        for (let soundIndex = 0; soundIndex < steps.length; soundIndex++) {
          const step = steps[soundIndex][index];
          
          // Only play if step is active
          if (step.active && samplerRef.current) {
            try {
              // Play with the step's velocity
              samplerRef.current.triggerAttackRelease(
                soundMap[soundIndex],
                '16n',
                time,
                step.velocity // Apply velocity (0-1 range)
              );
            } catch (error) {
              console.warn(`Error playing sound ${soundIndex} at step ${index}:`, error);
            }
          }
        }
      },
      [...Array(steps[0].length).keys()],
      '16n'
    );
    
    // Start the sequence if we're playing
    if (isPlaying) {
      sequenceRef.current.start(0);
    }
    
    // Cleanup function
    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
    };
  }, [steps, isPlaying, samplesLoaded]);
  
  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    // Don't allow playback if samples aren't loaded
    if (!samplesLoaded) {
      console.warn('Cannot play: drum samples not loaded');
      return;
    }
    
    try {
      // Explicitly start the audio context with user interaction
      if (Tone.context.state !== 'running') {
        console.log('Starting Tone.js context in useDrumSequencer...');
        await Tone.context.resume();
        await Tone.start();
        console.log('Tone.js context started in useDrumSequencer:', Tone.context.state);
      }
      
      if (isPlaying) {
        Tone.Transport.pause();
      } else {
        // Reset transport position before starting
        Tone.Transport.position = 0;
        Tone.Transport.start();
        
        // Start the sequence if it exists
        if (sequenceRef.current) {
          sequenceRef.current.start(0);
        }
      }
      
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }, [isPlaying, samplesLoaded]);
  
  // Stop playback
  const stop = useCallback(() => {
    Tone.Transport.stop();
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);
  
  // Toggle a step in the grid
  const toggleStep = useCallback((soundIndex: number, stepIndex: number) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[soundIndex] = [...prev[soundIndex]];
      // Toggle the active state while preserving velocity and probability
      newSteps[soundIndex][stepIndex] = {
        ...newSteps[soundIndex][stepIndex],
        active: !newSteps[soundIndex][stepIndex].active
      };
      return newSteps;
    });
  }, []);
  
  // Set velocity for a specific step
  const setStepVelocity = useCallback((soundIndex: number, stepIndex: number, velocity: number) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[soundIndex] = [...prev[soundIndex]];
      newSteps[soundIndex][stepIndex] = {
        ...newSteps[soundIndex][stepIndex],
        velocity: Math.max(0, Math.min(1, velocity)) // Clamp between 0-1
      };
      return newSteps;
    });
  }, []);
  

  
  // Play a specific drum sound with optional velocity
  const playSound = useCallback((soundType: DrumSoundType, velocity = 0.7) => {
    // Don't try to play if samples aren't loaded
    if (!samplesLoaded || !samplerRef.current) {
      console.warn('Cannot play sound: samples not loaded');
      return;
    }
    
    // Map sound type to note
    const noteMap: Record<DrumSoundType, string> = {
      kick: 'C2',
      snare: 'D2',
      hihat: 'F2',
      clap: 'G2',
    };
    
    try {
      // Play the sound with the specified velocity
      samplerRef.current.triggerAttackRelease(
        noteMap[soundType], 
        '16n', 
        undefined, // Use current time
        velocity // Apply velocity (0-1 range)
      );
    } catch (error) {
      console.warn(`Error playing ${soundType}:`, error);
    }
  }, [samplesLoaded]);
  
  // Set the entire pattern at once (useful for loading from MIDI)
  const setPattern = useCallback((pattern: boolean[][] | DrumStep[][]) => {
    // Validate pattern dimensions
    if (!pattern || !Array.isArray(pattern) || pattern.length !== 4) {
      console.error('Invalid pattern: must be a 2D array with 4 rows');
      return;
    }
    
    // Make sure each row has the correct number of steps
    const totalSteps = stepsPerBeat * totalBeats;
    
    // Handle both boolean[][] and DrumStep[][] pattern types
    if (typeof pattern[0][0] === 'boolean') {
      // Convert boolean pattern to DrumStep pattern
      const boolPattern = pattern as boolean[][];
      const drumStepPattern = boolPattern.map(row => {
        // If row is too short, pad with inactive steps
        if (row.length < totalSteps) {
          return [
            ...row.map(active => ({ 
              active, 
              velocity: 0.7
            })),
            ...Array(totalSteps - row.length).fill({ active: false, velocity: 0.7 })
          ];
        }
        // If row is too long, truncate
        if (row.length > totalSteps) {
          return row.slice(0, totalSteps).map(active => ({ 
            active, 
            velocity: 0.7
          }));
        }
        // Otherwise convert as is
        return row.map(active => ({ 
          active, 
          velocity: 0.7
        }));
      });
      
      // Update the steps state
      setSteps(drumStepPattern as DrumStep[][]);
    } else {
      // Handle DrumStep pattern
      const drumStepPattern = pattern as DrumStep[][];
      const validatedPattern = drumStepPattern.map(row => {
        // If row is too short, pad with inactive steps
        if (row.length < totalSteps) {
          return [
            ...row,
            ...Array(totalSteps - row.length).fill({ active: false, velocity: 0.7, probability: 1.0 })
          ];
        }
        // If row is too long, truncate
        if (row.length > totalSteps) {
          return row.slice(0, totalSteps);
        }
        // Otherwise return as is
        return [...row];
      });
      
      // Update the steps state
      setSteps(validatedPattern);
    }
    
    console.log('Pattern loaded successfully');
  }, [stepsPerBeat, totalBeats]);
  
  // Provide access to Tone.Transport for external synchronization
  const getTransport = useCallback(() => {
    return Tone.Transport;
  }, []);
  
  return {
    isPlaying,
    currentStep,
    bpm,
    swing,
    steps,
    volume,
    togglePlay,
    stop,
    setBpm,
    setSwing,
    toggleStep,
    setStepVelocity,
    setVolume,
    playSound,
    setPattern,
    samplesLoaded,
    samplesError,
    getTransport,
  };
};
