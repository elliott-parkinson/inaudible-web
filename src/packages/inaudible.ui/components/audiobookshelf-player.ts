import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { InaudibleMediaProgressService } from "../../inaudible.service/media-progress";
import type { DownloadsStore } from "../../inaudible.model/store/downloads-store";

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
  seekBar: HTMLInputElement;
  positionEl: HTMLSpanElement;
  chapterEl: HTMLSpanElement;
  remainingEl: HTMLSpanElement;
  sleepMetaEl: HTMLSpanElement;
  volumeSlider: HTMLInputElement;
  sleepSelect: HTMLSelectElement;
  sleepStatusEl: HTMLSpanElement;
  chapterSelect: HTMLSelectElement;
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
    this.audio = document.createElement('audio');
    this.audio.controls = false;
    this.statusEl = document.createElement('div');
    this.statusEl.style.fontSize = '0.9em';
    this.statusEl.style.color = '#666';
    this.statusEl.textContent = '';
    this.statusEl.className = 'player-status';

    const style = document.createElement('style');
    style.textContent = `
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
      .player-seek {
        width: 100%;
      }
      .player-meta {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        font-variant-numeric: tabular-nums;
        color: #555;
        font-size: 0.9em;
      }
      .player-meta span:nth-child(1) {
        text-align: left;
      }
      .player-meta span:nth-child(2) {
        text-align: left;
      }
      .player-meta span:nth-child(3) {
        text-align: center;
      }
      .player-meta span:nth-child(4) {
        text-align: right;
      }
      .player-status {
        font-size: 0.9em;
        color: #666;
      }
      .player-bottom-bar {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.8em;
        align-items: end;
      }
      .player-bottom-bar label {
        display: flex;
        flex-direction: column;
        gap: 0.35em;
        font-size: 0.8em;
        color: #666;
      }
      .player-bottom-bar input[type="range"] {
        width: 100%;
      }
      .player-bottom-bar select,
      .player-bottom-bar input[type="range"] {
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
          grid-template-columns: 1fr;
        }
      }
      audio {
        display: none;
      }
    `;

    this.rootEl = document.createElement('div');
    this.rootEl.className = 'player';

    const main = document.createElement('div');
    main.className = 'player-main';

    this.coverEl = document.createElement('img');
    this.coverEl.className = 'player-cover';
    this.coverEl.alt = 'Book cover';

    const controls = document.createElement('div');
    controls.className = 'player-controls';

    const buttons = document.createElement('div');
    buttons.className = 'player-buttons';

    this.prevChapterButton = document.createElement('button');
    this.prevChapterButton.type = 'button';
    this.prevChapterButton.textContent = 'Prev Chapter';

    this.backButton = document.createElement('button');
    this.backButton.type = 'button';
    this.backButton.textContent = 'Back 10s';

    this.playButton = document.createElement('button');
    this.playButton.type = 'button';
    this.playButton.className = 'player-play';
    this.playButton.textContent = 'Play';

    this.forwardButton = document.createElement('button');
    this.forwardButton.type = 'button';
    this.forwardButton.textContent = 'Forward 10s';

    this.nextChapterButton = document.createElement('button');
    this.nextChapterButton.type = 'button';
    this.nextChapterButton.textContent = 'Next Chapter';

    buttons.appendChild(this.prevChapterButton);
    buttons.appendChild(this.backButton);
    buttons.appendChild(this.playButton);
    buttons.appendChild(this.forwardButton);
    buttons.appendChild(this.nextChapterButton);

    controls.appendChild(buttons);

    main.appendChild(this.coverEl);
    main.appendChild(controls);

    this.seekBar = document.createElement('input');
    this.seekBar.type = 'range';
    this.seekBar.className = 'player-seek';
    this.seekBar.min = '0';
    this.seekBar.max = '100';
    this.seekBar.step = '1';
    this.seekBar.value = '0';

    const meta = document.createElement('div');
    meta.className = 'player-meta';
    this.positionEl = document.createElement('span');
    this.positionEl.textContent = '0:00';
    this.chapterEl = document.createElement('span');
    this.chapterEl.textContent = 'Chapter unavailable';
    this.remainingEl = document.createElement('span');
    this.remainingEl.textContent = '-0:00';
    this.sleepMetaEl = document.createElement('span');
    this.sleepMetaEl.textContent = '';

    meta.appendChild(this.positionEl);
    meta.appendChild(this.chapterEl);
    meta.appendChild(this.sleepMetaEl);
    meta.appendChild(this.remainingEl);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'player-bottom-bar';

    const volumeGroup = document.createElement('label');
    volumeGroup.className = 'player-volume';
    const volumeLabel = document.createElement('span');
    volumeLabel.textContent = 'Volume';
    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.step = '1';
    this.volumeSlider.value = '100';
    volumeGroup.appendChild(volumeLabel);
    volumeGroup.appendChild(this.volumeSlider);

    const sleepGroup = document.createElement('label');
    sleepGroup.className = 'player-sleep';
    const sleepLabel = document.createElement('span');
    sleepLabel.textContent = 'Sleep timer';
    this.sleepSelect = document.createElement('select');
    const sleepOptions = [
      { label: 'Off', value: '0' },
      { label: '15 min', value: '900' },
      { label: '30 min', value: '1800' },
      { label: '45 min', value: '2700' },
      { label: '60 min', value: '3600' },
      { label: '90 min', value: '5400' },
      { label: 'End of chapter', value: 'chapter' },
    ];
    sleepOptions.forEach((option) => {
      const entry = document.createElement('option');
      entry.value = option.value;
      entry.textContent = option.label;
      this.sleepSelect.appendChild(entry);
    });
    this.sleepStatusEl = document.createElement('span');
    this.sleepStatusEl.className = 'player-sleep-status';
    this.sleepStatusEl.textContent = 'Sleep off';
    sleepGroup.appendChild(sleepLabel);
    sleepGroup.appendChild(this.sleepSelect);
    sleepGroup.appendChild(this.sleepStatusEl);

    const chapterGroup = document.createElement('label');
    chapterGroup.className = 'player-chapters';
    const chapterLabel = document.createElement('span');
    chapterLabel.textContent = 'Chapters';
    this.chapterSelect = document.createElement('select');
    this.chapterSelect.disabled = true;
    const chapterOption = document.createElement('option');
    chapterOption.value = '-1';
    chapterOption.textContent = 'Chapters unavailable';
    this.chapterSelect.appendChild(chapterOption);
    chapterGroup.appendChild(chapterLabel);
    chapterGroup.appendChild(this.chapterSelect);

    bottomBar.appendChild(volumeGroup);
    bottomBar.appendChild(sleepGroup);
    bottomBar.appendChild(chapterGroup);

    this.rootEl.appendChild(main);
    this.rootEl.appendChild(this.seekBar);
    this.rootEl.appendChild(meta);
    this.rootEl.appendChild(bottomBar);
    this.rootEl.appendChild(this.statusEl);

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.rootEl);
    this.shadowRoot.appendChild(this.audio);

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

    this.seekBar.addEventListener('input', () => {
      this.isSeeking = true;
      const value = Number(this.seekBar.value);
      if (Number.isFinite(value)) {
        this.audio.currentTime = value;
        this.updateTimeUi();
      }
    });

    this.seekBar.addEventListener('change', () => {
      this.isSeeking = false;
      this.updateTimeUi();
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
      this.audio.play().catch(() => {});
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

  updateChapterLabel() {
    if (!Array.isArray(this.trackList) || this.trackList.length === 0) {
      this.chapterEl.textContent = 'Chapter unavailable';
      this.prevChapterButton.disabled = true;
      this.nextChapterButton.disabled = true;
      this.updateChapterSelect();
      return;
    }
    const current = Math.min(Math.max(this.currentTrackIndex, 0), this.trackList.length - 1);
    const track = this.trackList[current];
    const title = track?.title || track?.name || track?.metadata?.title;
    if (title) {
      this.chapterEl.textContent = `Chapter ${current + 1}: ${title}`;
    } else {
      this.chapterEl.textContent = `Chapter ${current + 1} of ${this.trackList.length}`;
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
    const remaining = Math.max(duration - currentTime, 0);
    const progress = duration > 0 ? currentTime / duration : 0;

    this.seekBar.max = duration ? String(Math.floor(duration)) : '0';
    this.seekBar.value = String(Math.floor(currentTime));

    this.positionEl.textContent = `${this.formatTime(currentTime)} (${Math.round(progress * 100)}%)`;
    this.remainingEl.textContent = `-${this.formatTime(remaining)}`;
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
    this.sleepMetaEl.textContent = 'Sleep: chapter';
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
    if (this.sleepMetaEl) {
      this.sleepMetaEl.textContent = '';
    }
  }

  updateSleepIndicators(seconds: number) {
    const label = `Sleep in ${this.formatTime(seconds)}`;
    this.sleepStatusEl.textContent = label;
    this.sleepMetaEl.textContent = label;
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
    return this.#loadLocalTrack(0);
  }

  #revokeLocalUrl() {
    if (this.#localObjectUrl) {
      URL.revokeObjectURL(this.#localObjectUrl);
      this.#localObjectUrl = null;
    }
  }

  #loadLocalTrack(index: number) {
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
    this.audio.play().catch(() => {});
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
