import type { IAudiobookPlayer } from "./iaudiobook-player";
import type { AudiobookPlayerCallbacks, LocalDownload, PlayerConfig } from "./types";

export class LocalPlayer implements IAudiobookPlayer {
  audio: HTMLAudioElement;
  trackList: Array<any>;
  currentTrackIndex: number;
  #localDownload: LocalDownload | null;
  #localObjectUrl: string | null;
  #callbacks: AudiobookPlayerCallbacks;

  constructor(audio: HTMLAudioElement, callbacks: AudiobookPlayerCallbacks) {
    this.audio = audio;
    this.#callbacks = callbacks;
    this.trackList = [];
    this.currentTrackIndex = 0;
    this.#localDownload = null;
    this.#localObjectUrl = null;
  }

  loadLocalDownload(download: LocalDownload, autoPlay: boolean) {
    if (!download?.tracks?.length) {
      return false;
    }
    this.#localDownload = download;
    this.trackList = download.tracks.map((track) => ({
      title: track.title,
      index: track.index,
      isLocal: true,
    }));
    this.currentTrackIndex = 0;
    return this.loadLocalTrack(0, autoPlay);
  }

  revokeLocalUrl() {
    if (this.#localObjectUrl) {
      URL.revokeObjectURL(this.#localObjectUrl);
      this.#localObjectUrl = null;
    }
  }

  configure(_options: PlayerConfig) {
    return;
  }

  abort() {
    return;
  }

  async startStream() {
    return;
  }

  seekBy(offsetSeconds: number) {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const nextTime = Math.min(Math.max(currentTime + offsetSeconds, 0), duration || currentTime + offsetSeconds);
    this.audio.currentTime = nextTime;
    this.#callbacks.onPlaybackUpdate();
  }

  switchChapter(offset: number) {
    if (!Array.isArray(this.trackList) || this.trackList.length === 0) {
      return;
    }
    this.playTrackAtIndex(this.currentTrackIndex + offset);
  }

  playTrackAtIndex(nextIndex: number) {
    if (!Array.isArray(this.trackList) || this.trackList.length === 0) {
      return;
    }
    if (nextIndex < 0 || nextIndex >= this.trackList.length) {
      return;
    }
    const loaded = this.loadLocalTrack(nextIndex);
    if (loaded) {
      this.currentTrackIndex = nextIndex;
    }
  }

  private loadLocalTrack(index: number, autoPlay: boolean = true) {
    if (!this.#localDownload?.tracks?.length) {
      return false;
    }
    if (index < 0 || index >= this.#localDownload.tracks.length) {
      return false;
    }
    const track = this.#localDownload.tracks[index];
    this.revokeLocalUrl();
    this.#localObjectUrl = URL.createObjectURL(track.blob);
    this.audio.src = this.#localObjectUrl;
    this.audio.load();
    this.#callbacks.onStatus?.('');
    if (autoPlay) {
      this.audio.play().catch(() => {});
    }
    this.#callbacks.onChapterUpdate();
    this.#callbacks.onPlaybackUpdate();
    this.#callbacks.onProgress(true);
    return true;
  }
}
