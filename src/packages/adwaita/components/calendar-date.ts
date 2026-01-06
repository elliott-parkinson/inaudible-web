class CalendarDateElement extends HTMLTimeElement {
    static get observedAttributes() {
        return ['datetime'];
    }

    connectedCallback() {
        this._render();
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (oldVal !== newVal) this._render();
    }

    _render() {
        const dt = this.getAttribute('datetime');
        if (!dt) return;

        const date = new Date(dt);
        if (isNaN(date.getTime())) return;

        const month = date.toLocaleString('en-GB', { month: 'short' });
        const day = date.getDate();

        this.innerHTML = `
            <style>
                :host {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                font-size: inherit;
                line-height: 1;
                text-align: center;
                }
                .month {
                font-weight: 600;
                font-size: 0.6em;
                text-transform: uppercase;
                }
                .day {
                font-size: 1em;
                }
            </style>
            <div class="month">${month}</div>
            <div class="day">${day}</div>
        `;
    }
}

customElements.define('calendar-date', CalendarDateElement, { extends: 'time' });
