import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { InaudibleMediaProgressService } from "../../inaudible.service/media-progress";
import type { MyLibraryStore } from "../../inaudible.store/store/my-library-store";

class AudiobookElement extends HTMLElement {
    static get observedAttributes() {
        return ['position', 'src', 'title', 'progress', 'libraryitemid', 'in-library'];
    }

    #root = this.attachShadow({ mode: 'open' });
    #eventTarget: EventTarget | null = null;
    #libraryItemId: string | null = null;
    #progressService: InaudibleMediaProgressService | null = null;
    #progressSubscriptionTarget: EventTarget | null = null;
    #progressEventName: string | null = null;
    #libraryStore: MyLibraryStore | null = null;
    #inLibrary: boolean = false;
    #onProgressEvent = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        this.#setInLibraryAttribute(this.#deriveInLibrary(detail));
        const progressValue = this.#extractProgress(detail);
        if (progressValue === null) {
            return;
        }
        const normalized = this.#normalizeProgress(progressValue);
        this.#setProgressAttribute(normalized);
    };

    connectedCallback() {
        this.#libraryItemId = this.getAttribute('libraryitemid');
        if (!this.hasAttribute('progress')) {
            this.#setProgressAttribute(0);
        }
        this.#setInLibraryAttribute(this.hasAttribute('in-library'));
        this.#ensureProgressService();
        this.#ensureLibraryStore();
        this.#updateProgressSubscription();
        this.#requestProgressUpdate();
        this.#loadInLibrary();
        this.#render();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
        if (oldVal === newVal) {
            return;
        }
        if (name === 'libraryitemid') {
            this.#libraryItemId = newVal;
            if (!this.hasAttribute('progress')) {
                this.#setProgressAttribute(0);
            }
            this.#setInLibraryAttribute(this.hasAttribute('in-library'));
            this.#ensureProgressService();
            this.#ensureLibraryStore();
            this.#updateProgressSubscription();
            this.#requestProgressUpdate();
            this.#loadInLibrary();
        }
        if (name === 'in-library') {
            this.#inLibrary = newVal !== null;
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

    #ensureLibraryStore() {
        if (this.#libraryStore) {
            return;
        }
        this.#libraryStore = (container.get("inaudible.store.library") as MyLibraryStore) ?? null;
    }

    #requestProgressUpdate() {
        if (!this.#libraryItemId || !this.#progressService) {
            return;
        }
        if (this.hasAttribute('progress')) {
            return;
        }
        void this.#progressService.updateByLibraryItemId(this.#libraryItemId);
    }

    async #loadInLibrary() {
        if (this.hasAttribute('in-library') || !this.#libraryStore || !this.#libraryItemId) {
            return;
        }
        const isInLibrary = await this.#libraryStore.has(this.#libraryItemId);
        this.#setInLibraryAttribute(isInLibrary);
        this.#render();
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

    #setInLibraryAttribute(value: boolean) {
        if (this.#inLibrary === value) {
            return;
        }
        this.#inLibrary = value;
        if (value) {
            this.setAttribute('in-library', 'true');
        } else {
            this.removeAttribute('in-library');
        }
    }

    #deriveInLibrary(detail: unknown): boolean {
        if (detail === null || detail === undefined) {
            return false;
        }
        if (typeof detail === 'number') {
            return true;
        }
        if (typeof detail === 'object') {
            return true;
        }
        return false;
    }

    #render() {
        const position = this.getAttribute('position');
        const src = this.getAttribute('src');
        const title = this.getAttribute('title');
        const progressRaw = parseFloat(this.getAttribute('progress') ?? '0');
        const progress = Number.isFinite(progressRaw) ? Math.min(Math.max(progressRaw, 0), 100) : 0;
        const inLibrary = this.hasAttribute('in-library');

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

              .library-flag {
                position: absolute;
                top: 0.35em;
                right: 0.35em;
                width: 1.6em;
                height: 1.6em;
                border-radius: 999px;
                background: #27AE60;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
              }

              .library-flag svg {
                width: 0.95em;
                height: 0.95em;
                fill: none;
                stroke: #fff;
                stroke-width: 3;
                stroke-linecap: round;
                stroke-linejoin: round;
              }
            }
        </style>
        <figure class="book">
        	${position ? `<span class="position">${position}</span>` : ''}
            ${inLibrary ? `
                <span class="library-flag" aria-label="In library">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12.5l4.2 4.2L19 7.5"></path>
                    </svg>
                </span>
            ` : ''}
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
