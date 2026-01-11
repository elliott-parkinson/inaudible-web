import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { InaudibleMediaProgressService } from "../../inaudible.service/media-progress";

class AudiobookElement extends HTMLElement {
    static get observedAttributes() {
        return ['position', 'src', 'title', 'progress', 'libraryitemid'];
    }

    #root = this.attachShadow({ mode: 'open' });
    #eventTarget: EventTarget | null = null;
    #libraryItemId: string | null = null;
    #progressService: InaudibleMediaProgressService | null = null;
    #progressSubscriptionTarget: EventTarget | null = null;
    #progressEventName: string | null = null;
    #onProgressEvent = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        const progressValue = this.#extractProgress(detail);
        if (progressValue === null) {
            return;
        }
        const normalized = this.#normalizeProgress(progressValue);
        this.#setProgressAttribute(normalized);
    };

    connectedCallback() {
        this.#libraryItemId = this.getAttribute('libraryitemid');
        this.#setProgressAttribute(0);
        this.#ensureProgressService();
        this.#updateProgressSubscription();
        this.#requestProgressUpdate();
        this.#render();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
        if (oldVal === newVal) {
            return;
        }
        if (name === 'libraryitemid') {
            this.#libraryItemId = newVal;
            this.#setProgressAttribute(0);
            this.#ensureProgressService();
            this.#updateProgressSubscription();
            this.#requestProgressUpdate();
        }
        this.#render();
    }

    disconnectedCallback() {
        this.#teardownProgressSubscription();
    }

    set eventTarget(value: EventTarget | null) {
        if (this.#eventTarget === value) {
            return;
        }
        this.#eventTarget = value;
        this.#updateProgressSubscription();
    }

    get eventTarget() {
        return this.#eventTarget;
    }

    #ensureProgressService() {
        if (this.#progressService) {
            return;
        }
        const service = container.get("inaudible.service") as InaudibleService | undefined;
        this.#progressService = service?.progress ?? null;
    }

    #requestProgressUpdate() {
        if (!this.#libraryItemId || !this.#progressService) {
            return;
        }
        void this.#progressService.updateByLibraryItemId(this.#libraryItemId);
    }

    #updateProgressSubscription() {
        this.#teardownProgressSubscription();
        const target = this.#progressService ?? this.#eventTarget;
        const eventName = this.#libraryItemId ? `${this.#libraryItemId}-progress` : null;
        if (!target || !eventName) {
            return;
        }
        target.addEventListener(eventName, this.#onProgressEvent);
        this.#progressSubscriptionTarget = target;
        this.#progressEventName = eventName;
    }

    #teardownProgressSubscription() {
        if (this.#progressSubscriptionTarget && this.#progressEventName) {
            this.#progressSubscriptionTarget.removeEventListener(this.#progressEventName, this.#onProgressEvent);
        }
        this.#progressSubscriptionTarget = null;
        this.#progressEventName = null;
    }

    #extractProgress(detail: unknown): number | null {
        if (typeof detail === 'number') {
            return detail;
        }
        if (detail && typeof detail === 'object') {
            const progress = (detail as { progress?: unknown }).progress;
            if (typeof progress === 'number') {
                return progress;
            }
        }
        return null;
    }

    #normalizeProgress(value: number): number {
        if (!Number.isFinite(value)) {
            return 0;
        }
        const normalized = value <= 1 ? value * 100 : value;
        return Math.min(Math.max(normalized, 0), 100);
    }

    #setProgressAttribute(value: number) {
        const valueString = value.toString();
        if (this.getAttribute('progress') === valueString) {
            return;
        }
        this.setAttribute('progress', valueString);
    }

    #render() {
        const position = this.getAttribute('position');
        const src = this.getAttribute('src');
        const title = this.getAttribute('title');
        const progressRaw = parseFloat(this.getAttribute('progress') ?? '0');
        const progress = Number.isFinite(progressRaw) ? Math.min(Math.max(progressRaw, 0), 100) : 0;

        this.#root.innerHTML = `
        <style>
            :host {

            }
            figure.book {
              width: 100%;
              display: flex;
              margin: 0;
              padding: 0;
              position: relative;

              > span.position {
                position: absolute;
                color: black;
                border-radius: 0.4em;
                background-color: darkgray;
                padding: 0.1em 0.4em;
                margin-top: 0.4em;
                margin-right: 0.4em;
                margin-left: 0.4em;
                opacity: 0.8;
                right: 0;
              }

              &:hover {
                cursor: pointer;
                opacity: 0.8;
              }

              > picture {
                width: 100%;
                height: 100%;
                display: flex;

                > img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;

                }
              }

              figcaption {
                display: none;
              }

              .progress-track {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 0.3em;
                background: rgba(0, 0, 0, 0.15);
              }

              .progress-bar {
                height: 100%;
                width: ${progress}%;
                background: #3584E4;
              }
            }
        </style>
        <figure class="book">
        	${position ? `<span class="position">${position}</span>` : ''}
            <picture>
                <img src="${src}" alt="${title}" />
            </picture>
            ${progress > 0 ? `<div class="progress-track"><div class="progress-bar"></div></div>` : ''}
            <figcaption>${title}</figcaption>
        </figure>
        `;
    }
}

customElements.define('inaudible-audiobook', AudiobookElement);
