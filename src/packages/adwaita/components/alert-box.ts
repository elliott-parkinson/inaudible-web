class AlertBox extends HTMLElement {
    static get observedAttributes() {
        return ['tone', 'type'];
    }

    #root = this.attachShadow({ mode: 'open' });

    connectedCallback() {
        this.#render();
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (oldVal !== newVal) this.#render();
    }

    #render() {
        const tone = this.getAttribute('tone') === 'polite' ? 'polite' : 'assertive';
        const role = tone === 'polite' ? 'status' : 'alert';
        const type = this.getAttribute('type') || 'info';

        const styles = {
            info:    { color: '#004085', bg: '#cce5ff', border: '#b8daff' },
            success: { color: '#155724', bg: '#d4edda', border: '#c3e6cb' },
            warning: { color: '#856404', bg: '#fff3cd', border: '#ffeeba' },
            error:   { color: '#721c24', bg: '#f8d7da', border: '#f5c6cb' },
        };

        const { color, bg, border } = styles[type] || styles.info;

        this.#root.innerHTML = `
        <style>
            :host {
            display: block;
            font-size: inherit;
            border-left: 0.4em solid ${border};
            background: ${bg};
            padding: 0.75em 1em;
            border-radius: 1em;
            color: ${color};
            }
            ::slotted(h1),
            ::slotted(h2),
            ::slotted(h3),
            ::slotted(strong) {
            margin: 0 0 0.25em 0;
            font-size: 1em;
            }
            ::slotted(p) {
            margin: 0;
            }
        </style>
        <div role="${role}" aria-live="${tone}">
            <slot name="heading"></slot>
            <slot></slot>
        </div>
        `;
    }
}

customElements.define('alert-box', AlertBox);
