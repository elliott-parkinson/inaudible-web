import { html, render } from "lit-html";
import { createRef, ref } from "lit-html/directives/ref.js";

type TimeUpdate = {
  currentTime: number;
  duration: number;
  progress: number;
};

export class PlayerTrackElement extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  #seekRef = createRef<HTMLInputElement>();
  #positionRef = createRef<HTMLSpanElement>();
  #chapterRef = createRef<HTMLSpanElement>();
  #sleepRef = createRef<HTMLSpanElement>();
  #remainingRef = createRef<HTMLSpanElement>();
  #seekBar: HTMLInputElement | null = null;
  #positionEl: HTMLSpanElement | null = null;
  #chapterEl: HTMLSpanElement | null = null;
  #sleepEl: HTMLSpanElement | null = null;
  #remainingEl: HTMLSpanElement | null = null;
  #duration: number = 0;

  constructor() {
    super();
    this.#render();
    this.#bindRefs();
    this.#attachEvents();
  }

  #render() {
    render(
      html`
        <style>
          :host {
            display: block;
          }
          .track {
            display: flex;
            flex-direction: column;
            gap: 0.6em;
          }
          .track-seek {
            width: 100%;
          }
          .track-meta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            font-variant-numeric: tabular-nums;
            color: #555;
            font-size: 0.9em;
          }
          .track-meta span:nth-child(1) {
            text-align: left;
          }
          .track-meta span:nth-child(2) {
            text-align: left;
          }
          .track-meta span:nth-child(3) {
            text-align: center;
          }
          .track-meta span:nth-child(4) {
            text-align: right;
          }
          .track-sleep {
            color: #888;
          }
        </style>
        <div class="track">
          <input
            ${ref(this.#seekRef)}
            class="track-seek"
            type="range"
            min="0"
            max="100"
            step="1"
            value="0"
          />
          <div class="track-meta">
            <span ${ref(this.#positionRef)}>0:00</span>
            <span ${ref(this.#chapterRef)}>Chapter unavailable</span>
            <span ${ref(this.#sleepRef)} class="track-sleep"></span>
            <span ${ref(this.#remainingRef)}>-0:00</span>
          </div>
        </div>
      `,
      this.#root
    );
  }

  #bindRefs() {
    this.#seekBar = this.#seekRef.value;
    this.#positionEl = this.#positionRef.value;
    this.#chapterEl = this.#chapterRef.value;
    this.#sleepEl = this.#sleepRef.value;
    this.#remainingEl = this.#remainingRef.value;
  }

  #attachEvents() {
    if (!this.#seekBar) {
      return;
    }
    this.#seekBar.addEventListener('input', () => {
      const value = Number(this.#seekBar?.value);
      if (!Number.isFinite(value)) {
        return;
      }
      this.updateTime({
        currentTime: value,
        duration: this.#duration,
        progress: this.#duration > 0 ? value / this.#duration : 0,
      });
      this.dispatchEvent(new CustomEvent('seek', { detail: { time: value, isFinal: false } }));
    });

    this.#seekBar.addEventListener('change', () => {
      const value = Number(this.#seekBar?.value);
      if (!Number.isFinite(value)) {
        return;
      }
      this.dispatchEvent(new CustomEvent('seek', { detail: { time: value, isFinal: true } }));
    });
  }

  updateTime({ currentTime, duration, progress }: TimeUpdate) {
    const safeDuration = Number.isFinite(duration) ? duration : 0;
    const safeCurrent = Number.isFinite(currentTime) ? currentTime : 0;
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    this.#duration = safeDuration;

    const remaining = Math.max(safeDuration - safeCurrent, 0);
    if (this.#seekBar) {
      this.#seekBar.max = safeDuration ? String(Math.floor(safeDuration)) : '0';
      this.#seekBar.value = String(Math.floor(safeCurrent));
    }
    if (this.#positionEl) {
      this.#positionEl.textContent = `${this.formatTime(safeCurrent)} (${Math.round(safeProgress * 100)}%)`;
    }
    if (this.#remainingEl) {
      this.#remainingEl.textContent = `-${this.formatTime(remaining)}`;
    }
  }

  setChapterLabel(label: string) {
    if (this.#chapterEl) {
      this.#chapterEl.textContent = label;
    }
  }

  setSleepLabel(label: string) {
    if (this.#sleepEl) {
      this.#sleepEl.textContent = label ?? '';
    }
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
}

customElements.define('player-track', PlayerTrackElement);
