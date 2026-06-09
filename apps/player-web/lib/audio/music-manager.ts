/*
Purpose: controls streamed background music playlist playback
Layer: frontend (player-web)
Uses: HTMLAudioElement and public audio assets
*/

export const BACKGROUND_MUSIC_TRACKS = [
  "/assets/audio/music/eye-in-the-sky-01.mp3",
  "/assets/audio/music/eye-in-the-sky-02.mp3",
  "/assets/audio/music/eye-in-the-sky-03.mp3",
  "/assets/audio/music/eye-in-the-sky-04.mp3"
] as const;

const MUSIC_ELEMENT_ID = "eye-in-the-sky-background-music";
const MUSIC_MANAGER_VERSION = 1;

class MusicManager {
  readonly version = MUSIC_MANAGER_VERSION;

  private audio: HTMLAudioElement | null = null;

  private enabled = false;

  private volume = 0.35;

  private trackIndex = 0;

  private needsUserGesture = false;

  private readonly handleTrackEnded = () => {
    this.trackIndex = (this.trackIndex + 1) % BACKGROUND_MUSIC_TRACKS.length;
    const audio = this.audio;
    if (!audio) {
      return;
    }

    audio.src = BACKGROUND_MUSIC_TRACKS[this.trackIndex];
    if (this.enabled && this.volume > 0) {
      void this.play().catch(() => {
        this.needsUserGesture = true;
      });
    }
  };

  configure(options: { enabled: boolean; volume: number }) {
    this.enabled = options.enabled;
    this.volume = Number.isFinite(options.volume) ? Math.min(1, Math.max(0, options.volume)) : 0.35;

    if (!this.enabled || this.volume <= 0) {
      this.pause();
      return;
    }

    const audio = this.ensureAudio();
    if (!audio) {
      return;
    }

    audio.volume = this.volume;

    void this.play().catch(() => {
      this.needsUserGesture = true;
    });
  }

  prime() {
    if (!this.enabled || this.volume <= 0) {
      return;
    }

    void this.play().catch(() => {
      this.needsUserGesture = true;
    });
  }

  pause() {
    this.needsUserGesture = false;
    this.audio?.pause();
  }

  dispose() {
    this.enabled = false;
    this.needsUserGesture = false;

    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener("ended", this.handleTrackEnded);
    }
  }

  private ensureAudio() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    if (this.audio) {
      return this.audio;
    }

    document
      .querySelectorAll<HTMLAudioElement>(`audio[data-eye-sky-music="1"]:not(#${MUSIC_ELEMENT_ID})`)
      .forEach((duplicate) => {
        duplicate.pause();
        duplicate.remove();
      });

    const existingAudio = document.getElementById(MUSIC_ELEMENT_ID) as HTMLAudioElement | null;
    const audio = existingAudio ?? document.createElement("audio");
    audio.id = MUSIC_ELEMENT_ID;
    audio.dataset.eyeSkyMusic = "1";
    audio.preload = "auto";
    audio.src = audio.src || BACKGROUND_MUSIC_TRACKS[this.trackIndex];
    audio.volume = this.volume;
    audio.loop = false;

    if (!existingAudio) {
      audio.style.display = "none";
      document.body.appendChild(audio);
    }

    audio.removeEventListener("ended", this.handleTrackEnded);
    audio.addEventListener("ended", this.handleTrackEnded);

    this.audio = audio;
    return audio;
  }

  private async play() {
    const audio = this.ensureAudio();
    if (!audio) {
      return;
    }

    audio.volume = this.volume;
    if (audio.paused || this.needsUserGesture) {
      this.needsUserGesture = false;
      await audio.play();
    }
  }
}

declare global {
  interface Window {
    __eyeInTheSkyMusicManager?: MusicManager;
  }
}

const getMusicManager = () => {
  if (typeof window === "undefined") {
    return new MusicManager();
  }

  const existing = window.__eyeInTheSkyMusicManager;
  if (existing?.version === MUSIC_MANAGER_VERSION) {
    return existing;
  }

  existing?.dispose?.();
  const manager = new MusicManager();
  window.__eyeInTheSkyMusicManager = manager;
  return manager;
};

export const musicManager = getMusicManager();
