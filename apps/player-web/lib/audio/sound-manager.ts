/*
Purpose: plays lightweight synthetic game audio with optional stereo pan
Layer: frontend (player-web)
Uses: slot hook and board presentation events
*/

type SoundEvent =
  | "spin"
  | "drop"
  | "win"
  | "loss"
  | "cascade"
  | "multiplier"
  | "bonus"
  | "big_win"
  | "super_win";

type SoundOptions = {
  pan?: number;
};

type SoundPreset = {
  baseFrequency: number;
  duration: number;
  volume: number;
  sweep?: number;
  type: OscillatorType;
  harmonics?: number[];
  noise?: boolean;
  attack?: number;
  release?: number;
};

class SoundManager {
  private audioContext: AudioContext | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  private getContext() {
    if (typeof window === "undefined") {
      return null;
    }

    if (!this.audioContext) {
      const Context =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
      this.audioContext = Context ? new Context() : null;
    }

    return this.audioContext;
  }

  prime() {
    const context = this.getContext();
    if (context?.state === "suspended") {
      void context.resume().catch(() => {
        // ignore browser-level resume rejections from autoplay policies
      });
    }
  }

  /*
  Purpose: plays a named game sound preset
  Layer: frontend (player-web)
  Uses: UI interactions and board feedback
  */
  play(event: SoundEvent, enabled: boolean, options: SoundOptions = {}) {
    if (!enabled) {
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    const preset = this.getPreset(event);
    const now = context.currentTime;
    const output = context.createGain();
    const panner = typeof StereoPannerNode !== "undefined"
      ? new StereoPannerNode(context, { pan: options.pan ?? 0 })
      : null;

    const attack = preset.attack ?? 0.02;
    const release = preset.release ?? preset.duration;

    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(preset.volume, now + attack);
    output.gain.exponentialRampToValueAtTime(0.0001, now + release);

    if (panner) {
      output.connect(panner);
      panner.connect(context.destination);
    } else {
      output.connect(context.destination);
    }

    // add a small harmonic stack for richer tone
    [0, ...(preset.harmonics ?? [])].forEach((ratio, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = preset.type;
      oscillator.frequency.setValueAtTime(preset.baseFrequency * (ratio || 1), now);

      if (preset.sweep) {
        oscillator.frequency.linearRampToValueAtTime(
          preset.baseFrequency * (ratio || 1) + preset.sweep,
          now + preset.duration
        );
      }

      gain.gain.setValueAtTime(index === 0 ? 0.9 : 0.25, now);
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start(now);
      oscillator.stop(now + preset.duration);
    });

    if (preset.noise) {
      this.playNoiseBurst(context, output, now, preset.duration);
    }
  }

  private getPreset(event: SoundEvent): SoundPreset {
    const presets: Record<SoundEvent, SoundPreset> = {
      spin: {
        baseFrequency: 112,
        duration: 0.16,
        volume: 0.055,
        sweep: 24,
        type: "triangle",
        harmonics: [2]
      },
      drop: {
        baseFrequency: 180,
        duration: 0.11,
        volume: 0.04,
        sweep: -16,
        type: "sine",
        noise: true
      },
      win: {
        baseFrequency: 610,
        duration: 0.44,
        volume: 0.055,
        sweep: 90,
        type: "triangle",
        harmonics: [1.5, 2, 3],
        attack: 0.014,
        release: 0.42
      },
      loss: {
        baseFrequency: 186,
        duration: 0.36,
        volume: 0.028,
        sweep: -32,
        type: "sine",
        harmonics: [0.5, 1.5],
        noise: true,
        attack: 0.01,
        release: 0.28
      },
      cascade: {
        baseFrequency: 344,
        duration: 0.26,
        volume: 0.04,
        sweep: 64,
        type: "sine",
        harmonics: [2],
        noise: true,
        attack: 0.012,
        release: 0.24
      },
      multiplier: {
        baseFrequency: 840,
        duration: 0.42,
        volume: 0.052,
        sweep: 180,
        type: "triangle",
        harmonics: [2, 3, 4],
        attack: 0.012,
        release: 0.38
      },
      bonus: {
        baseFrequency: 520,
        duration: 1.2,
        volume: 0.048,
        sweep: 260,
        type: "sine",
        harmonics: [1.25, 1.5, 2],
        attack: 0.03,
        release: 1.08
      },
      big_win: {
        baseFrequency: 430,
        duration: 1.45,
        volume: 0.068,
        sweep: 320,
        type: "triangle",
        harmonics: [1.5, 2, 3, 4],
        noise: true,
        attack: 0.016,
        release: 1.26
      },
      super_win: {
        baseFrequency: 468,
        duration: 1.85,
        volume: 0.082,
        sweep: 420,
        type: "triangle",
        harmonics: [1.25, 1.5, 2, 3, 4, 5],
        noise: true,
        attack: 0.01,
        release: 1.68
      }
    };

    return presets[event];
  }

  private playNoiseBurst(
    context: AudioContext,
    destination: GainNode,
    now: number,
    duration: number
  ) {
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = this.getNoiseBuffer(context);
    source.connect(gain);
    gain.connect(destination);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.start(now);
    source.stop(now + duration);
  }

  private getNoiseBuffer(context: AudioContext) {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const buffer = context.createBuffer(1, context.sampleRate * 0.35, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}

export const soundManager = new SoundManager();
