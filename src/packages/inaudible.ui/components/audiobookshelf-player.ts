import { container } from "../../../container";
import { html, render } from "lit-html";
import type { PlayerTrackElement } from "./player-track";
import type { InaudibleService } from "../../inaudible.service";
import type { InaudibleMediaProgressService } from "../../inaudible.service/media-progress";
import type { DownloadsStore } from "../../inaudible.model/store/downloads-store";

const css = html`
  <style>
    :host {
      display: block;
    }
    .player {
      display: flex;
      flex-direction: column;
      gap: 0.9em;
    }
    .player-main {
      display: grid;
      grid-template-columns: minmax(90px, 140px) 1fr;
      gap: 1em;
      align-items: center;
    }
    .player-cover {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: 0.6em;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
      background: #e6e6e6;
    }
    .player-controls {
      display: flex;
      flex-direction: column;
      gap: 0.8em;
    }
    .player-buttons {
      display: flex;
      align-items: center;
      gap: 0.6em;
      flex-wrap: wrap;
    }
    .player-buttons button {
      border: 1px solid #d1d1d1;
      background: #fff;
      padding: 0.5em 0.8em;
      border-radius: 0.6em;
      cursor: pointer;
    }
    .player-buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .player-play {
      font-size: 1.1em;
      padding: 0.75em 1.4em;
      border-radius: 999px;
      border: none;
      background: #1d1d1d;
      color: #fff;
      min-width: 120px;
    }
    .player-status {
      font-size: 0.9em;
      color: #666;
    }
    .player-bottom-bar {
      display: flex;
      justify-content: flex-end;
      gap: 0.8em;
      flex-wrap: wrap;
      margin-top: 0.2em;
    }
    .player-popover {
      position: relative;
    }
    .player-popover > button {
      border: 1px solid #d1d1d1;
      background: #fff;
      padding: 0.5em 0.8em;
      border-radius: 0.6em;
      cursor: pointer;
      font-weight: 600;
    }
    .player-popover-panel {
      position: absolute;
      right: 0;
      top: calc(100% + 0.4em);
      background: #fff;
      border: 1px solid #e2e2e2;
      border-radius: 0.6em;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      padding: 0.7em;
      min-width: 200px;
      z-index: 2;
      display: none;
    }
    .player-popover-panel.open {
      display: block;
    }
    .player-popover-panel label {
      display: flex;
      flex-direction: column;
      gap: 0.35em;
      font-size: 0.8em;
      color: #666;
    }
    .player-popover-panel input[type="range"] {
      width: 100%;
    }
    .player-popover-panel select,
    .player-popover-panel input[type="range"] {
      border: 1px solid #d1d1d1;
      border-radius: 0.45em;
      padding: 0.35em 0.5em;
      font-size: 0.95em;
      background: #fff;
    }
    .player-sleep-status {
      font-size: 0.75em;
      color: #888;
    }
    @media (max-width: 640px) {
      .player-bottom-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .player-popover-panel {
        left: 0;
        right: auto;
        width: 100%;
      }
    }
    audio {
      display: none;
    }
  </style>`;

class AudiobookshelfPlayerElement extends HTMLElement {
  audio: HTMLAudioElement;
  mediaItemId: string | null;
  apiKey: string | null;
  baseUrl: string | null;
  coverUrl: string | null;
  startPosition: number;
  statusEl: HTMLDivElement;
  controller: AbortController | null;
  lastProgressSentAt: number;
  trackList: Array<any>;
  currentTrackIndex: number;
  sessionId: string | null;
  sessionBase: string | null;
  isSeeking: boolean;
  rootEl: HTMLDivElement;
  coverEl: HTMLImageElement;
  playButton: HTMLButtonElement;
  backButton: HTMLButtonElement;
  forwardButton: HTMLButtonElement;
  prevChapterButton: HTMLButtonElement;
  nextChapterButton: HTMLButtonElement;
  trackEl: PlayerTrackElement;
  volumeButton: HTMLButtonElement;
  volumeSlider: HTMLInputElement;
  sleepButton: HTMLButtonElement;
  sleepSelect: HTMLSelectElement;
  sleepStatusEl: HTMLSpanElement;
  chapterButton: HTMLButtonElement;
  chapterSelect: HTMLSelectElement;
  volumePopover: HTMLDivElement;
  volumePanel: HTMLDivElement;
  sleepPopover: HTMLDivElement;
  sleepPanel: HTMLDivElement;
  chapterPopover: HTMLDivElement;
  chapterPanel: HTMLDivElement;
  #progressService: InaudibleMediaProgressService | null;
  #progressSubscriptionTarget: EventTarget | null;
  #progressEventName: string | null;
  #pendingStartPosition: number | null;
  #pendingProgressRatio: number | null;
  #hasAppliedStartPosition: boolean;
  #initialPositionLocked: boolean;
  #sleepTimerId: number | null;
  #sleepIntervalId: number | null;
  #sleepEndsAt: number | null;
  #sleepMode: 'off' | 'timer' | 'chapter';
  #downloadsStore: DownloadsStore | null;
  #localObjectUrl: string | null;
  #localDownload: { tracks: Array<{ index: number; title: string; size: number; blob: Blob }> } | null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#renderTemplate();
    this.#cacheElements();
    this.audio.controls = false;

    this.mediaItemId = null;
    this.apiKey = null;
    this.baseUrl = null;
    this.coverUrl = null;
    this.startPosition = 0;
    this.controller = null;
    this.lastProgressSentAt = 0;
    this.trackList = [];
    this.currentTrackIndex = 0;
    this.sessionId = null;
    this.sessionBase = null;
    this.isSeeking = false;
    this.#progressService = null;
    this.#progressSubscriptionTarget = null;
    this.#progressEventName = null;
    this.#pendingStartPosition = null;
    this.#pendingProgressRatio = null;
    this.#hasAppliedStartPosition = false;
    this.#initialPositionLocked = false;
    this.#sleepTimerId = null;
    this.#sleepIntervalId = null;
    this.#sleepEndsAt = null;
    this.#sleepMode = 'off';
    this.#downloadsStore = null;
    this.#localObjectUrl = null;
    this.#localDownload = null;
  }

  #renderTemplate() {
    const sleepOptions = [
      { label: 'Off', value: '0' },
      { label: '15 min', value: '900' },
      { label: '30 min', value: '1800' },
      { label: '45 min', value: '2700' },
      { label: '60 min', value: '3600' },
      { label: '90 min', value: '5400' },
      { label: 'End of chapter', value: 'chapter' },
    ];

    render(
      html`
        ${css}
        <div class="player" data-role="root">
          <div class="player-main">
            <img class="player-cover" data-role="cover" alt="Book cover" />
            <div class="player-controls">
              <div class="player-buttons">
                <button type="button" data-role="prev-chapter">Prev Chapter</button>
                <button type="button" data-role="back">Back 10s</button>
                <button type="button" data-role="play" class="player-play">Play</button>
                <button type="button" data-role="forward">Forward 10s</button>
                <button type="button" data-role="next-chapter">Next Chapter</button>
              </div>
              <div class="player-bottom-bar">
                <div class="player-popover" data-role="volume-popover">
                  <button type="button" data-role="volume-button">Volume</button>
                  <div class="player-popover-panel" data-role="volume-panel">
                    <label class="player-volume">
                      <span>Volume</span>
                      <input type="range" data-role="volume-slider" min="0" max="100" step="1" value="100" />
                    </label>
                  </div>
                </div>
                <div class="player-popover" data-role="sleep-popover">
                  <button type="button" data-role="sleep-button">Sleep</button>
                  <div class="player-popover-panel" data-role="sleep-panel">
                    <label class="player-sleep">
                      <span>Sleep timer</span>
                      <select data-role="sleep-select">
                        ${sleepOptions.map(
                          (option) => html`<option value=${option.value}>${option.label}</option>`
                        )}
                      </select>
                      <span class="player-sleep-status" data-role="sleep-status">Sleep off</span>
                    </label>
                  </div>
                </div>
                <div class="player-popover" data-role="chapter-popover">
                  <button type="button" data-role="chapter-button">Chapters</button>
                  <div class="player-popover-panel" data-role="chapter-panel">
                    <label class="player-chapters">
                      <span>Chapters</span>
                      <select data-role="chapter-select" disabled>
                        <option value="-1">Chapters unavailable</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <player-track data-role="track"></player-track>
          <div class="player-status" data-role="status"></div>
        </div>
        <audio data-role="audio"></audio>
      `,
      this.shadowRoot as ShadowRoot
    );
  }

  #cacheElements() {
    const root = this.shadowRoot as ShadowRoot;
    this.rootEl = root.querySelector('[data-role="root"]') as HTMLDivElement;
    this.coverEl = root.querySelector('[data-role="cover"]') as HTMLImageElement;
    this.playButton = root.querySelector('[data-role="play"]') as HTMLButtonElement;
    this.backButton = root.querySelector('[data-role="back"]') as HTMLButtonElement;
    this.forwardButton = root.querySelector('[data-role="forward"]') as HTMLButtonElement;
    this.prevChapterButton = root.querySelector('[data-role="prev-chapter"]') as HTMLButtonElement;
    this.nextChapterButton = root.querySelector('[data-role="next-chapter"]') as HTMLButtonElement;
    this.volumeButton = root.querySelector('[data-role="volume-button"]') as HTMLButtonElement;
    this.volumeSlider = root.querySelector('[data-role="volume-slider"]') as HTMLInputElement;
    this.volumePopover = root.querySelector('[data-role="volume-popover"]') as HTMLDivElement;
    this.volumePanel = root.querySelector('[data-role="volume-panel"]') as HTMLDivElement;
    this.sleepButton = root.querySelector('[data-role="sleep-button"]') as HTMLButtonElement;
    this.sleepSelect = root.querySelector('[data-role="sleep-select"]') as HTMLSelectElement;
    this.sleepStatusEl = root.querySelector('[data-role="sleep-status"]') as HTMLSpanElement;
    this.sleepPopover = root.querySelector('[data-role="sleep-popover"]') as HTMLDivElement;
    this.sleepPanel = root.querySelector('[data-role="sleep-panel"]') as HTMLDivElement;
    this.chapterButton = root.querySelector('[data-role="chapter-button"]') as HTMLButtonElement;
    this.chapterSelect = root.querySelector('[data-role="chapter-select"]') as HTMLSelectElement;
    this.chapterPopover = root.querySelector('[data-role="chapter-popover"]') as HTMLDivElement;
    this.chapterPanel = root.querySelector('[data-role="chapter-panel"]') as HTMLDivElement;
    this.trackEl = root.querySelector('[data-role="track"]') as PlayerTrackElement;
    this.statusEl = root.querySelector('[data-role="status"]') as HTMLDivElement;
    this.audio = root.querySelector('[data-role="audio"]') as HTMLAudioElement;
  }

  async connectedCallback() {
    this.mediaItemId = this.getAttribute('media-item-id');
    this.apiKey = this.getAttribute('api-key');
    this.baseUrl = this.getAttribute('base-url');
    this.coverUrl = this.getAttribute('cover-url');
    this.startPosition = parseFloat(this.getAttribute('start-position')) || 0;
    this.#initialPositionLocked = this.startPosition > 0;
    if (this.#initialPositionLocked) {
      this.#pendingStartPosition = this.startPosition;
    }
    if (this.coverUrl) {
      this.coverEl.src = this.coverUrl;
    }

    if (!this.mediaItemId || !this.apiKey || !this.baseUrl) {
      console.error('Missing media-item-id, api-key, or base-url');
      this.statusEl.textContent = 'Missing playback settings.';
      return;
    }

    this.#ensureProgressService();
    this.#ensureDownloadsStore();
    this.#updateProgressSubscription();
    this.#requestProgressUpdate();

    this.audio.addEventListener('loadedmetadata', () => {
      this.#applyStartPosition();
      this.updateTimeUi();
    }, { once: true });

    this.statusEl.textContent = 'Loading audio...';
    const loadedLocal = await this.#loadLocalAudio();
    if (!loadedLocal) {
      await this.startStream();
    }
    this.#applyStartPosition();

    this.audio.addEventListener('timeupdate', () => {
      this.updateTimeUi();
      this.maybeSendProgress(false);
    });

    this.audio.addEventListener('pause', () => {
      this.updatePlayButton();
      this.maybeSendProgress(true);
    });

    this.audio.addEventListener('play', () => {
      this.updatePlayButton();
    });

    this.audio.addEventListener('ended', () => {
      this.updatePlayButton();
      this.maybeSendProgress(true);
      if (this.#sleepMode === 'chapter') {
        this.sleepSelect.value = '0';
        this.clearSleepTimer();
      }
    });

    this.playButton.addEventListener('click', () => {
      if (this.audio.paused) {
        this.audio.play().catch(() => {});
      } else {
        this.audio.pause();
      }
      this.updatePlayButton();
    });

    this.backButton.addEventListener('click', () => {
      this.seekBy(-10);
    });

    this.forwardButton.addEventListener('click', () => {
      this.seekBy(10);
    });

    this.prevChapterButton.addEventListener('click', () => {
      this.switchChapter(-1);
    });

    this.nextChapterButton.addEventListener('click', () => {
      this.switchChapter(1);
    });

    this.trackEl.addEventListener('seek', (event) => {
      const detail = (event as CustomEvent).detail as { time?: number; isFinal?: boolean };
      const value = Number(detail?.time);
      if (!Number.isFinite(value)) {
        return;
      }
      this.isSeeking = !detail?.isFinal;
      this.audio.currentTime = value;
      this.updateTimeUi();
      if (detail?.isFinal) {
        this.isSeeking = false;
      }
    });

    const closeAllPopovers = () => {
      this.volumePanel.classList.remove('open');
      this.sleepPanel.classList.remove('open');
      this.chapterPanel.classList.remove('open');
    };

    this.volumeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = this.volumePanel.classList.contains('open');
      closeAllPopovers();
      if (!isOpen) {
        this.volumePanel.classList.add('open');
      }
    });

    this.sleepButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = this.sleepPanel.classList.contains('open');
      closeAllPopovers();
      if (!isOpen) {
        this.sleepPanel.classList.add('open');
      }
    });

    this.chapterButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = this.chapterPanel.classList.contains('open');
      closeAllPopovers();
      if (!isOpen) {
        this.chapterPanel.classList.add('open');
      }
    });

    this.rootEl.addEventListener('click', (event) => {
      const path = event.composedPath();
      if (path.includes(this.volumePopover) || path.includes(this.sleepPopover) || path.includes(this.chapterPopover)) {
        return;
      }
      closeAllPopovers();
    });

    const storedVolume = this.#readStoredValue('inaudible.player.volume');
    if (storedVolume) {
      const storedNumber = Number(storedVolume);
      if (Number.isFinite(storedNumber)) {
        const clamped = Math.min(Math.max(storedNumber, 0), 100);
        this.volumeSlider.value = String(clamped);
        this.audio.volume = clamped / 100;
      }
    }

    const storedSleep = this.#readStoredValue('inaudible.player.sleep');
    if (storedSleep && storedSleep !== '0') {
      this.sleepSelect.value = storedSleep;
      if (storedSleep === 'chapter') {
        this.setSleepChapterMode();
      } else {
        const seconds = Number(storedSleep);
        if (Number.isFinite(seconds) && seconds > 0) {
          this.setSleepTimer(seconds);
        }
      }
    }

    this.volumeSlider.addEventListener('input', () => {
      const value = Number(this.volumeSlider.value);
      if (Number.isFinite(value)) {
        const clamped = Math.min(Math.max(value, 0), 100);
        this.audio.volume = clamped / 100;
        this.#storeValue('inaudible.player.volume', String(clamped));
      }
    });

    this.sleepSelect.addEventListener('change', () => {
      const value = this.sleepSelect.value;
      this.#storeValue('inaudible.player.sleep', value);
      if (value === 'chapter') {
        this.setSleepChapterMode();
        return;
      }
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        this.clearSleepTimer();
        return;
      }
      this.setSleepTimer(seconds);
    });

    this.chapterSelect.addEventListener('change', () => {
      const nextIndex = Number(this.chapterSelect.value);
      if (Number.isFinite(nextIndex) && nextIndex >= 0) {
        this.playTrackAtIndex(nextIndex);
      }
    });
  }

  disconnectedCallback() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    this.#teardownProgressSubscription();
    this.clearSleepTimer();
    this.#revokeLocalUrl();
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
          this.statusEl.textContent = 'Playback failed: missing session id.';
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
      this.statusEl.textContent = '';
      if (this.shouldAutoplay()) {
        this.audio.play().catch(() => {});
      }
      this.updateChapterSelect();
      this.updateChapterLabel();
      this.updatePlayButton();
      this.updateTimeUi();
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

  seekBy(offsetSeconds: number) {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const nextTime = Math.min(Math.max(currentTime + offsetSeconds, 0), duration || currentTime + offsetSeconds);
    this.audio.currentTime = nextTime;
    this.updateTimeUi();
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
    if (this.#localDownload?.tracks?.length) {
      const loaded = this.#loadLocalTrack(nextIndex);
      if (loaded) {
        this.currentTrackIndex = nextIndex;
      }
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
    this.updateChapterSelect();
    this.updateChapterLabel();
    this.updatePlayButton();
    this.updateTimeUi();
  }

  updatePlayButton() {
    this.playButton.textContent = this.audio.paused ? 'Play' : 'Pause';
  }

  shouldAutoplay() {
    const setting = this.getAttribute('autoplay');
    if (setting === null) {
      return true;
    }
    return setting !== 'false';
  }

  updateChapterLabel() {
    if (!Array.isArray(this.trackList) || this.trackList.length === 0) {
      this.trackEl.setChapterLabel('Chapter unavailable');
      this.prevChapterButton.disabled = true;
      this.nextChapterButton.disabled = true;
      this.updateChapterSelect();
      return;
    }
    const current = Math.min(Math.max(this.currentTrackIndex, 0), this.trackList.length - 1);
    const track = this.trackList[current];
    const title = track?.title || track?.name || track?.metadata?.title;
    if (title) {
      this.trackEl.setChapterLabel(`Chapter ${current + 1}: ${title}`);
    } else {
      this.trackEl.setChapterLabel(`Chapter ${current + 1} of ${this.trackList.length}`);
    }
    this.prevChapterButton.disabled = current <= 0;
    this.nextChapterButton.disabled = current >= this.trackList.length - 1;
    this.updateChapterSelect();
  }

  updateChapterSelect() {
    if (!this.chapterSelect) {
      return;
    }
    this.chapterSelect.innerHTML = '';
    if (!Array.isArray(this.trackList) || this.trackList.length === 0) {
      const option = document.createElement('option');
      option.value = '-1';
      option.textContent = 'Chapters unavailable';
      this.chapterSelect.appendChild(option);
      this.chapterSelect.disabled = true;
      return;
    }
    this.trackList.forEach((track, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const title = track?.title || track?.name || track?.metadata?.title;
      option.textContent = title ? `Chapter ${index + 1}: ${title}` : `Chapter ${index + 1}`;
      this.chapterSelect.appendChild(option);
    });
    this.chapterSelect.disabled = false;
    this.chapterSelect.value = String(Math.min(Math.max(this.currentTrackIndex, 0), this.trackList.length - 1));
  }

  updateTimeUi() {
    if (this.isSeeking) {
      return;
    }
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const progress = duration > 0 ? currentTime / duration : 0;

    this.trackEl.updateTime({
      currentTime,
      duration,
      progress,
    });
    this.dispatchEvent(new CustomEvent('player-timeupdate', { detail: { currentTime, duration, progress } }));
  }

  formatTime(totalSeconds: number) {
    if (!Number.isFinite(totalSeconds)) {
      return '0:00';
    }
    const rounded = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  setSleepTimer(seconds: number) {
    this.clearSleepTimer();
    this.#sleepMode = 'timer';
    const durationMs = Math.max(seconds, 0) * 1000;
    if (!durationMs) {
      return;
    }
    this.#sleepEndsAt = Date.now() + durationMs;
    this.updateSleepIndicators(seconds);
    this.#sleepTimerId = window.setTimeout(() => {
      this.audio.pause();
      this.updatePlayButton();
      this.sleepSelect.value = '0';
      this.clearSleepTimer();
    }, durationMs);
    this.#sleepIntervalId = window.setInterval(() => {
      if (!this.#sleepEndsAt) {
        return;
      }
      const remainingMs = Math.max(this.#sleepEndsAt - Date.now(), 0);
      if (remainingMs <= 0) {
        return;
      }
      this.updateSleepIndicators(remainingMs / 1000);
    }, 1000);
  }

  setSleepChapterMode() {
    this.clearSleepTimer();
    this.#sleepMode = 'chapter';
    this.sleepStatusEl.textContent = 'Sleep at chapter end';
    this.trackEl.setSleepLabel('Sleep: chapter');
  }

  clearSleepTimer() {
    if (this.#sleepTimerId) {
      window.clearTimeout(this.#sleepTimerId);
    }
    if (this.#sleepIntervalId) {
      window.clearInterval(this.#sleepIntervalId);
    }
    this.#sleepTimerId = null;
    this.#sleepIntervalId = null;
    this.#sleepEndsAt = null;
    this.#sleepMode = 'off';
    if (this.sleepStatusEl) {
      this.sleepStatusEl.textContent = 'Sleep off';
    }
    this.trackEl.setSleepLabel('');
  }

  updateSleepIndicators(seconds: number) {
    const label = `Sleep in ${this.formatTime(seconds)}`;
    this.sleepStatusEl.textContent = label;
    this.trackEl.setSleepLabel(label);
  }

  #readStoredValue(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  #storeValue(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  #ensureProgressService() {
    if (this.#progressService) {
      return;
    }
    const service = container.get("inaudible.service") as InaudibleService | undefined;
    this.#progressService = service?.progress ?? null;
  }

  #ensureDownloadsStore() {
    if (this.#downloadsStore) {
      return;
    }
    this.#downloadsStore = (container.get("inaudible.store.downloads") as DownloadsStore) ?? null;
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

  async #loadLocalAudio() {
    if (!this.#downloadsStore || !this.mediaItemId) {
      return false;
    }
    const download = await this.#downloadsStore.get(this.mediaItemId);
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
    return this.#loadLocalTrack(0, this.shouldAutoplay());
  }

  #revokeLocalUrl() {
    if (this.#localObjectUrl) {
      URL.revokeObjectURL(this.#localObjectUrl);
      this.#localObjectUrl = null;
    }
  }

  #loadLocalTrack(index: number, autoPlay: boolean = true) {
    if (!this.#localDownload?.tracks?.length) {
      return false;
    }
    if (index < 0 || index >= this.#localDownload.tracks.length) {
      return false;
    }
    const track = this.#localDownload.tracks[index];
    this.#revokeLocalUrl();
    this.#localObjectUrl = URL.createObjectURL(track.blob);
    this.audio.src = this.#localObjectUrl;
    this.audio.load();
    this.statusEl.textContent = '';
    if (autoPlay) {
      this.audio.play().catch(() => {});
    }
    this.updateChapterSelect();
    this.updateChapterLabel();
    this.updatePlayButton();
    this.updateTimeUi();
    this.maybeSendProgress(true);
    return true;
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
