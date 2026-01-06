class DurationDisplay extends HTMLTimeElement {
    static get observedAttributes() {
        return ['data-seconds'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    private render(): void {
        const rawText = this.getAttribute('data-seconds');
        const raw = rawText ? parseFloat(rawText) : NaN;

        if (isNaN(raw) || raw <= 0) {
            this.textContent = '';
            this.removeAttribute('datetime');
            return;
        }

        const hours = Math.floor(raw / 3600);
        const minutes = Math.floor((raw % 3600) / 60);
        const seconds = Math.floor(raw % 60);

        const parts: string[] = [];
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (seconds || parts.length === 0) parts.push(`${seconds}s`);

        this.textContent = parts.join(' ');
        this.setAttribute('datetime', `PT${hours}H${minutes}M${seconds}S`);
    }
}

customElements.define('duration-display', DurationDisplay, { extends: 'time' });
