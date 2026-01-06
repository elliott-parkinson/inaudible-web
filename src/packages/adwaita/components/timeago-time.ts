class TimeagoTime extends HTMLTimeElement {
    private timerId: number | null = null;
    private originalDate: Date | null = null;

    connectedCallback() {
        const datetime = this.getAttribute('datetime');
        if (!datetime) return;

        this.originalDate = new Date(datetime);
        this.updateText();
    }

    disconnectedCallback() {
        if (this.timerId) clearInterval(this.timerId);
    }

    private updateText() {
        if (!this.originalDate) return;

        const now = Date.now();
        const diffSeconds = (now - this.originalDate.getTime()) / 1000;
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

        const units = [
            { unit: 'second', seconds: 1 },
            { unit: 'minute', seconds: 60 },
            { unit: 'hour', seconds: 3600 },
            { unit: 'day', seconds: 86400 },
            { unit: 'week', seconds: 604800 },
            { unit: 'month', seconds: 2629800 },
            { unit: 'year', seconds: 31557600 }
        ];

        let selectedUnit = 'second';
        let delta = 0;
        let interval = 60000;

        for (let i = units.length - 1; i >= 0; i--) {
            const { unit, seconds } = units[i];
            const value = diffSeconds / seconds;
            if (Math.abs(value) >= 1) {
                selectedUnit = unit;
                delta = Math.round(-value);
                interval = this.getIntervalForUnit(unit);
                break;
            }
        }

        this.textContent = rtf.format(delta, selectedUnit as any);
        this.scheduleUpdate(interval);
    }

    private getIntervalForUnit(unit: string): number {
        const fallback: number =  86400000;
        switch (unit) {
            case 'second': return 1000;
            case 'minute': return 60000;
            case 'hour': return 3600000;
            case 'day': return 86400000;
            default: return fallback;
        }
    }

    private scheduleUpdate(ms: number) {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = window.setInterval(() => this.updateText(), ms);
    }
}

customElements.define('timeago-time', TimeagoTime, { extends: 'time' });
