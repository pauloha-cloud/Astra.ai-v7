/**
 * Utility functions for audio processing in the Multimodal Live API.
 * Handles PCM encoding/decoding and base64 conversion.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private currentStream: MediaStream | null = null;
  private sampleRate = 16000;
  private bufferSize = 4096;

  constructor(
    private onAudioData: (base64Data: string) => void,
    private onActivity?: (isActive: boolean) => void,
    private onVolume?: (volume: number) => void
  ) {}

  async start() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
    });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("[AudioStreamer] getUserMedia failed:", err);
      this.stop();
      throw err;
    }

    // Safety check: if stop() was called during getUserMedia prompt
    if (!this.audioContext) {
      console.log("[AudioStreamer] AudioContext was cleared/stopped during userMedia acquisition.");
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    this.currentStream = stream;
    const source = this.audioContext.createMediaStreamSource(stream);
    
    this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

    let silenceCount = 0;
    const silenceThreshold = 0.01;
    const silenceLimit = 20; // Number of chunks to consider silence

    this.processor.onaudioprocess = (e) => {
      if (!this.audioContext) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Basic VAD (Voice Activity Detection)
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      
      if (rms > silenceThreshold) {
        silenceCount = 0;
        this.onActivity?.(true);
      } else {
        silenceCount++;
        if (silenceCount > silenceLimit) {
          this.onActivity?.(false);
          silenceCount = silenceLimit;
        }
      }

      this.onVolume?.(rms); // Send volume data

      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = this.base64Encode(pcmData);
      this.onAudioData(base64Data);
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    if (this.currentStream) {
      try {
        this.currentStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("[AudioStreamer] Error stopping stream tracks:", e);
      }
      this.currentStream = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {
        // ignore
      }
      this.processor = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        try {
          this.audioContext.close();
        } catch (e) {
          // ignore
        }
      }
      this.audioContext = null;
    }
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private base64Encode(buffer: Int16Array): string {
    const bytes = new Uint8Array(buffer.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export class AudioPlayer {
  private audioContext: AudioContext;
  private nextStartTime: number = 0;
  private sampleRate = 24000; // Gemini default output rate
  private isPlaying: boolean = false;
  private onStatusChange?: (isPlaying: boolean) => void;
  private onVolume?: (volume: number) => void;
  private timeoutId: any = null;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array;

  constructor(onStatusChange?: (isPlaying: boolean) => void, onVolume?: (volume: number) => void) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
    });
    this.nextStartTime = this.audioContext.currentTime;
    this.onStatusChange = onStatusChange;
    this.onVolume = onVolume;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.connect(this.audioContext.destination);

    this.startVolumeTracking();
  }

  private startVolumeTracking() {
    const update = () => {
      if (this.isPlaying) {
        this.analyser.getByteFrequencyData(this.frequencyData);
        let sum = 0;
        for (let i = 0; i < this.frequencyData.length; i++) {
          sum += this.frequencyData[i];
        }
        const volume = (sum / this.frequencyData.length) / 255;
        this.onVolume?.(volume);
      } else {
        this.onVolume?.(0);
      }
      requestAnimationFrame(update);
    };
    update();
  }

  playFromBase64(base64Data: string) {
    const pcmData = this.base64To16BitPCM(base64Data);
    const floatData = this.pcmToFloat32(pcmData);
    
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(floatData);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser); // Connect to analyser instead of destination directly

    const now = this.audioContext.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }
    
    source.start(this.nextStartTime);
    
    // Track playback status
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onStatusChange?.(true);
    }

    // Set a timeout to check if playback has ended
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    const durationMs = (this.nextStartTime + audioBuffer.duration - now) * 1000;
    this.timeoutId = setTimeout(() => {
      this.isPlaying = false;
      this.onStatusChange?.(false);
    }, durationMs);

    this.nextStartTime += audioBuffer.duration;
  }

  private base64To16BitPCM(base64: string): Int16Array {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  private pcmToFloat32(pcm: Int16Array): Float32Array {
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float[i] = pcm[i] / 0x8000;
    }
    return float;
  }

  close() {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
