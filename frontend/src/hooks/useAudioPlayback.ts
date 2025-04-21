import { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

interface DrumKit {
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  hihat: Tone.MetalSynth;
  clap: Tone.NoiseSynth;
}

export const useAudioPlayback = (bpm: number = 120, swingRatio: number = 0.5) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [drumKit, setDrumKit] = useState<DrumKit | null>(null);

  // Initialize drum samples
  useEffect(() => {
    const initDrumKit = async () => {
      const kit: DrumKit = {
        kick: new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 10,
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.001,
            decay: 0.4,
            sustain: 0.01,
            release: 1.4,
            attackCurve: 'exponential'
          }
        }).toDestination(),
        snare: new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0
          }
        }).toDestination(),
        hihat: new Tone.MetalSynth({
          envelope: {
            attack: 0.001,
            decay: 0.1,
            release: 0.01
          },
          harmonicity: 5.1,
          modulationIndex: 32,
          octaves: 1.5
        }).toDestination(),
        clap: new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: {
            attack: 0.001,
            decay: 0.3,
            sustain: 0
          }
        }).toDestination(),
      };

      setDrumKit(kit);
    };

    initDrumKit();

    // Cleanup function
    return () => {
      if (drumKit) {
        Object.values(drumKit).forEach(synth => synth.dispose());
      }
    };
  }, []);

  // Update tempo and swing when they change
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.swing = swingRatio;
  }, [bpm, swingRatio]);

  const playStep = useCallback((step: number, pattern: boolean[][]) => {
    if (!drumKit) return;

    // Play each instrument if its step is active
    if (pattern[0][step]) drumKit.kick.triggerAttackRelease('C1', '8n');
    if (pattern[1][step]) drumKit.snare.triggerAttackRelease('8n', '+0.01');
    if (pattern[2][step]) drumKit.hihat.triggerAttackRelease('8n', '+0.01');
    if (pattern[3][step]) drumKit.clap.triggerAttackRelease('8n', '+0.01');

    // Update current step
    setCurrentStep(step);
  }, [drumKit]);

  const startPlayback = useCallback(async (pattern: boolean[][]) => {
    try {
      // Start Tone.js audio context
      await Tone.start();
      await Tone.loaded();

      // Clear any existing events
      Tone.Transport.cancel();

    // Schedule pattern playback
    const numSteps = pattern[0].length;
    const stepDuration = '16n'; // sixteenth notes

    // Schedule each step
    const repeat = () => {
      const position = Tone.Transport.position.toString();
      const [, , sixteenths] = position.split(':');
      const step = Math.floor(Number(sixteenths) * 4) % numSteps;
      playStep(step, pattern);
    };

    // Schedule the repeat event
    Tone.Transport.scheduleRepeat(repeat, stepDuration);

    // Start playback
    Tone.Transport.start();
    setIsPlaying(true);
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  }, [playStep]);

  const stopPlayback = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    currentStep,
    startPlayback,
    stopPlayback,
    isReady: !!drumKit,
  };
};
