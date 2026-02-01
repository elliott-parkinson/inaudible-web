import type { IAudiobookPlayer } from "./iaudiobook-player";
import type { AudiobookPlayerCallbacks, LocalDownload, PlayerConfig } from "./types";

export class AudiobookshelfPlayer implements IAudiobookPlayer {
  audio: HTMLAudioElement;
  mediaItemId: string | null;
  apiKey: string | null;
  baseUrl: string | null;
  trackList: Array<any>;
  currentTrackIndex: number;
  sessionId: string | null;
  sessionBase: string | null;
  controller: AbortController | null;
  #callbacks: AudiobookPlayerCallbacks;

  constructor(audio: HTMLAudioElement, callbacks: AudiobookPlayerCallbacks) {
    this.audio = audio;
    this.#callbacks = callbacks;
    this.mediaItemId = null;
    this.apiKey = null;
    this.baseUrl = null;
    this.trackList = [];
    this.currentTrackIndex = 0;
    this.sessionId = null;
    this.sessionBase = null;
    this.controller = null;
  }

  configure(options: PlayerConfig) {
    this.mediaItemId = options.mediaItemId;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
  }

  abort() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  async startStream() {
    if (!this.mediaItemId || !this.apiKey || !this.baseUrl) {
      return;
    }

    const apiBase = this.normalizeApiBase(this.baseUrl);
    const streamUrl = `${apiBase}/items/${this.mediaItemId}/play?token=${encodeURIComponent(this.apiKey)}`;
    this.controller = new AbortController();
    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        signal: this.controller?.signal,
      });

      if (!response.ok) {
        this.#callbacks.onStatus?.(`Playback failed: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      const trackCandidates =
        data?.libraryItem?.media?.tracks ||
        data?.media?.tracks ||
        data?.audioTracks ||
        data?.mediaMetadata?.audioTracks ||
        [];

      this.trackList = Array.isArray(trackCandidates) ? trackCandidates : [];

      const pickTrack = (tracks: Array<any>) => {
        if (!Array.isArray(tracks)) {
          return null;
        }
        const nonHls = tracks.find((track) => track?.contentUrl && !track.contentUrl.includes('/hls/'));
        return nonHls ?? tracks.find((track) => track?.contentUrl) ?? null;
      };

      const pickedTrack = pickTrack(trackCandidates);
      const contentUrl = pickedTrack?.contentUrl;
      this.currentTrackIndex = Math.max(0, this.trackList.findIndex((track) => track?.contentUrl === contentUrl));

      if (contentUrl) {
        const absoluteUrl = this.resolveContentUrl(apiBase, contentUrl, this.apiKey);
        this.audio.src = absoluteUrl;
      } else {
        const sessionId = data?.id;
        const trackIndex =
          data?.audioTracks?.[0]?.index ??
          data?.mediaMetadata?.audioTracks?.[0]?.index ??
          data?.libraryItem?.media?.tracks?.[0]?.index ??
          1;

        if (!sessionId) {
          this.#callbacks.onStatus?.('Playback failed: missing session id.');
          return;
        }

        const sessionBase = apiBase.replace(/\/api$/, '');
        const sessionUrl = `${sessionBase}/public/session/${sessionId}/track/${trackIndex}`;
        this.sessionId = sessionId;
        this.sessionBase = sessionBase;
        this.currentTrackIndex = Math.max(0, this.trackList.findIndex((track) => track?.index === trackIndex));
        this.audio.src = sessionUrl;
      }
      this.audio.load();
      this.#callbacks.onStatus?.('');
      if (this.#callbacks.shouldAutoplay()) {
        this.audio.play().catch(() => {});
      }
      this.#callbacks.onChapterUpdate();
      this.#callbacks.onPlaybackUpdate();
      this.#callbacks.onProgress(true);
    } catch (error) {
      const isAbort =
        this.controller?.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError');
      if (isAbort) {
        return;
      }
      console.error('audiobookshelf stream error', error);
      this.#callbacks.onStatus?.('Playback failed while streaming.');
      this.#callbacks.onError?.(error);
    }
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
    const track = this.trackList[nextIndex];
    const contentUrl = track?.contentUrl;
    if (contentUrl) {
      const apiBase = this.normalizeApiBase(this.baseUrl ?? '');
      this.audio.src = this.resolveContentUrl(apiBase, contentUrl, this.apiKey ?? '');
    } else if (this.sessionId && this.sessionBase) {
      const trackIndex = track?.index ?? nextIndex + 1;
      this.audio.src = `${this.sessionBase}/public/session/${this.sessionId}/track/${trackIndex}`;
    } else {
      return;
    }
    this.currentTrackIndex = nextIndex;
    this.audio.load();
    this.audio.play().catch(() => {});
    this.#callbacks.onChapterUpdate();
    this.#callbacks.onPlaybackUpdate();
  }

  loadLocalDownload(_download: LocalDownload, _autoPlay: boolean) {
    return false;
  }

  revokeLocalUrl() {
    return;
  }

  private normalizeApiBase(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/+$/, '');
    if (trimmed.endsWith('/audiobookshelf/api')) {
      return trimmed;
    }
    if (trimmed.endsWith('/audiobookshelf')) {
      return `${trimmed}/api`;
    }
    return `${trimmed}/audiobookshelf/api`;
  }

  private resolveContentUrl(apiBase: string, contentUrl: string, token: string): string {
    const origin = apiBase.replace(/\/api$/, '');
    const url = contentUrl.startsWith('http') ? contentUrl : `${origin}${contentUrl}`;
    if (url.includes('token=')) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}
