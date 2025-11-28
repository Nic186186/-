import { AudioContextType } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;

    const AudioContextClass = window.AudioContext || (window as unknown as AudioContextType).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create Pink/White Noise Buffer
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // (roughly) compensate for gain
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    // Filter to simulate wind "muffling"
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 200; // Start muted

    // Gain to control volume
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0;

    // Connect graph
    this.noiseNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.noiseNode.start(0);
    this.isInitialized = true;
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateWind(intensity: number) {
    if (!this.ctx || !this.gainNode || !this.filterNode) return;

    const now = this.ctx.currentTime;
    
    // Map intensity (0-1) to Volume and Frequency
    // Intensity comes from hand speed
    const targetGain = Math.min(intensity * 1.5, 0.8); // Max volume 0.8
    const targetFreq = 200 + (intensity * 1500); // 200Hz to 1700Hz

    // Smooth transitions
    this.gainNode.gain.setTargetAtTime(targetGain, now, 0.1);
    this.filterNode.frequency.setTargetAtTime(targetFreq, now, 0.2);
  }

  stop() {
    if (this.ctx) {
      this.ctx.close();
      this.isInitialized = false;
    }
  }
}

export const audioEngine = new AudioEngine();