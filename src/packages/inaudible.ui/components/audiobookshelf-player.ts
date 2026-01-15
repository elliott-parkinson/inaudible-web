import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { InaudibleMediaProgressService } from "../../inaudible.service/media-progress";

class AudiobookshelfPlayerElement extends HTMLElement {
  audio: HTMLAudioElement;
  mediaItemId: string | null;
  apiKey: string | null;
  baseUrl: string | null;
  startPosition: number;
  statusEl: HTMLDivElement;
  controller: AbortController | null;
  lastProgressSentAt: number;
  #progressService: InaudibleMediaProgressService | null;
  #progressSubscriptionTarget: EventTarget | null;
  #progressEventName: string | null;
  #pendingStartPosition: number | null;
  #pendingProgressRatio: number | null;
  #hasAppliedStartPosition: boolean;
  #initialPositionLocked: boolean;

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
    this.#progressService = null;
    this.#progressSubscriptionTarget = null;
    this.#progressEventName = null;
    this.#pendingStartPosition = null;
    this.#pendingProgressRatio = null;
    this.#hasAppliedStartPosition = false;
    this.#initialPositionLocked = false;
  }

  async connectedCallback() {
    this.mediaItemId = this.getAttribute('media-item-id');
    this.apiKey = this.getAttribute('api-key');
    this.baseUrl = this.getAttribute('base-url');
    this.startPosition = parseFloat(this.getAttribute('start-position')) || 0;
    this.#initialPositionLocked = this.startPosition > 0;
    if (this.#initialPositionLocked) {
      this.#pendingStartPosition = this.startPosition;
    }

    if (!this.mediaItemId || !this.apiKey || !this.baseUrl) {
      console.error('Missing media-item-id, api-key, or base-url');
      this.statusEl.textContent = 'Missing playback settings.';
      return;
    }

    this.#ensureProgressService();
    this.#updateProgressSubscription();
    this.#requestProgressUpdate();

    this.audio.addEventListener('loadedmetadata', () => {
      this.#applyStartPosition();
    }, { once: true });

    this.statusEl.textContent = 'Loading audio...';
    await this.startStream();
    this.#applyStartPosition();

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
    this.#teardownProgressSubscription();
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

  #ensureProgressService() {
    if (this.#progressService) {
      return;
    }
    const service = container.get("inaudible.service") as InaudibleService | undefined;
    this.#progressService = service?.progress ?? null;
  }

  #requestProgressUpdate() {
    if (!this.mediaItemId || !this.#progressService) {
      return;
    }
    void this.#progressService.updateByLibraryItemId(this.mediaItemId);
  }

  #updateProgressSubscription() {
    this.#teardownProgressSubscription();
    if (!this.mediaItemId || !this.#progressService) {
      return;
    }
    const eventName = `${this.mediaItemId}-progress`;
    this.#progressService.addEventListener(eventName, this.#onProgressEvent);
    this.#progressSubscriptionTarget = this.#progressService;
    this.#progressEventName = eventName;
  }

  #teardownProgressSubscription() {
    if (this.#progressSubscriptionTarget && this.#progressEventName) {
      this.#progressSubscriptionTarget.removeEventListener(this.#progressEventName, this.#onProgressEvent);
    }
    this.#progressSubscriptionTarget = null;
    this.#progressEventName = null;
  }

  #onProgressEvent = (event: Event) => {
    if (this.#initialPositionLocked || this.#hasAppliedStartPosition) {
      return;
    }
    const detail = (event as CustomEvent).detail as unknown;
    const progressData = this.#extractProgress(detail);
    if (!progressData) {
      return;
    }
    if (progressData.currentTime !== null) {
      this.#pendingStartPosition = progressData.currentTime;
      this.#pendingProgressRatio = null;
    } else if (progressData.progressRatio !== null) {
      this.#pendingProgressRatio = progressData.progressRatio;
    }
    this.#applyStartPosition();
  };

  #extractProgress(detail: unknown): { currentTime: number | null; progressRatio: number | null } | null {
    if (typeof detail === 'number' && Number.isFinite(detail)) {
      return detail <= 1 ? { currentTime: null, progressRatio: detail } : { currentTime: detail, progressRatio: null };
    }
    if (!detail || typeof detail !== 'object') {
      return null;
    }
    const data = detail as { currentTime?: unknown; progress?: unknown };
    if (typeof data.currentTime === 'number' && Number.isFinite(data.currentTime)) {
      return { currentTime: data.currentTime, progressRatio: null };
    }
    if (typeof data.progress === 'number' && Number.isFinite(data.progress)) {
      return data.progress <= 1
        ? { currentTime: null, progressRatio: data.progress }
        : { currentTime: data.progress, progressRatio: null };
    }
    return null;
  }

  #applyStartPosition() {
    if (this.#hasAppliedStartPosition) {
      return;
    }
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    let target = this.#pendingStartPosition ?? 0;
    if (!target && this.#pendingProgressRatio !== null && duration > 0) {
      target = duration * this.#pendingProgressRatio;
    }
    if (!target || target <= 0 || duration <= 0) {
      return;
    }
    this.audio.currentTime = Math.min(target, duration);
    this.#hasAppliedStartPosition = true;
  }

  maybeSendProgress(force: boolean) {

    const now = Date.now();
    if (!force && now - this.lastProgressSentAt < 5000) {
      return;
    }
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const progress = duration > 0 ? currentTime / duration : 0;

    if (this.mediaItemId && this.#progressService) {
      void this.#progressService.updateMediaProgressByLibraryItemId(this.mediaItemId, currentTime, duration, progress);
    }

    this.lastProgressSentAt = now;
  }

}

customElements.define('audiobookshelf-player', AudiobookshelfPlayerElement);
