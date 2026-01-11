import { container } from "../../../container";

class AudiobookshelfPlayerElement extends HTMLElement {
  audio: HTMLAudioElement;
  mediaItemId: string | null;
  apiKey: string | null;
  baseUrl: string | null;
  startPosition: number;
  statusEl: HTMLDivElement;
  controller: AbortController | null;
  lastProgressSentAt: number;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audio = document.createElement('audio');
    this.audio.controls = true;
    this.statusEl = document.createElement('div');
    this.statusEl.style.fontSize = '0.9em';
    this.statusEl.style.color = '#666';
    this.statusEl.textContent = '';
    this.shadowRoot.appendChild(this.audio);
    this.shadowRoot.appendChild(this.statusEl);

    this.mediaItemId = null;
    this.apiKey = null;
    this.baseUrl = null;
    this.startPosition = 0;
    this.controller = null;
    this.lastProgressSentAt = 0;
  }

  async connectedCallback() {
    this.mediaItemId = this.getAttribute('media-item-id');
    this.apiKey = this.getAttribute('api-key');
    this.baseUrl = this.getAttribute('base-url');
    this.startPosition = parseFloat(this.getAttribute('start-position')) || 0;

    if (!this.mediaItemId || !this.apiKey || !this.baseUrl) {
      console.error('Missing media-item-id, api-key, or base-url');
      this.statusEl.textContent = 'Missing playback settings.';
      return;
    }

    this.statusEl.textContent = 'Loading audio...';
    await this.startStream();

    if (this.startPosition > 0) {
      this.audio.addEventListener('loadedmetadata', () => {
        this.audio.currentTime = this.startPosition;
      }, { once: true });
    }

    this.audio.addEventListener('timeupdate', () => {
      this.maybeSendProgress(false);
    });

    this.audio.addEventListener('pause', () => {
      this.maybeSendProgress(true);
    });

    this.audio.addEventListener('ended', () => {
      this.maybeSendProgress(true);
    });
  }

  disconnectedCallback() {
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
        this.statusEl.textContent = `Playback failed: ${response.status} ${response.statusText}`;
        return;
      }

      const data = await response.json();
      const trackCandidates =
        data?.libraryItem?.media?.tracks ||
        data?.media?.tracks ||
        data?.audioTracks ||
        data?.mediaMetadata?.audioTracks ||
        [];

      const pickTrack = (tracks: Array<any>) => {
        if (!Array.isArray(tracks)) {
          return null;
        }
        const nonHls = tracks.find((track) => track?.contentUrl && !track.contentUrl.includes('/hls/'));
        return nonHls ?? tracks.find((track) => track?.contentUrl) ?? null;
      };

      const pickedTrack = pickTrack(trackCandidates);
      const contentUrl = pickedTrack?.contentUrl;

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
          this.statusEl.textContent = 'Playback failed: missing session id.';
          return;
        }

        const sessionBase = apiBase.replace(/\/api$/, '');
        const sessionUrl = `${sessionBase}/public/session/${sessionId}/track/${trackIndex}`;
        this.audio.src = sessionUrl;
      }
      this.audio.load();
      this.statusEl.textContent = '';
      this.audio.play().catch(() => {});
      this.maybeSendProgress(true);
    } catch (error) {
      if (!this.controller?.signal.aborted) {
        console.error('audiobookshelf stream error', error);
        this.statusEl.textContent = 'Playback failed while streaming.';
      }
    }
  }

  normalizeApiBase(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/+$/, '');
    if (trimmed.endsWith('/audiobookshelf/api')) {
      return trimmed;
    }
    if (trimmed.endsWith('/audiobookshelf')) {
      return `${trimmed}/api`;
    }
    return `${trimmed}/audiobookshelf/api`;
  }

  resolveContentUrl(apiBase: string, contentUrl: string, token: string): string {
    const origin = apiBase.replace(/\/api$/, '');
    const url = contentUrl.startsWith('http') ? contentUrl : `${origin}${contentUrl}`;
    if (url.includes('token=')) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }


  maybeSendProgress(force: boolean) {

    const now = Date.now();
    if (!force && now - this.lastProgressSentAt < 5000) {
      return;
    }
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const progress = duration > 0 ? currentTime / duration : 0;

    const mediaProgressService = container.get("inaudible.service.media-progress") as any;
    mediaProgressService?.updateMediaProgressByLibraryItemId(this.mediaItemId!, progress * duration, duration);

    this.lastProgressSentAt = now;
  }

}

customElements.define('audiobookshelf-player', AudiobookshelfPlayerElement);
