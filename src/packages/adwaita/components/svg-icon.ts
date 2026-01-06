class SvgIconElement extends HTMLElement {
    static get observedAttributes() {
        return ['src', 'stroke', 'fill'];
    }

    #shadow = this.attachShadow({ mode: 'open' });

    connectedCallback() {
        this.#loadSvg();
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (oldVal !== newVal) this.#loadSvg();
    }

    async #loadSvg() {
        const src = this.getAttribute('src');
        if (!src) return;

        try {
            const res = await fetch(src);
            const svgText = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            const svg = doc.querySelector('svg');
            if (!svg) throw new Error('Invalid SVG');

            // Apply stroke/fill overrides
            const stroke = this.getAttribute('stroke');
            const fill = this.getAttribute('fill');
            if (stroke) svg.setAttribute('stroke', stroke);
            if (fill) svg.setAttribute('fill', fill);

            // Clear and inject
            this.#shadow.innerHTML = '';
            this.#shadow.appendChild(svg);
        } catch (err) {
            console.error('SVG load error:', err);
            this.#shadow.innerHTML = '<span>⚠️</span>';
        }
    }
}

customElements.define('svg-icon', SvgIconElement);
