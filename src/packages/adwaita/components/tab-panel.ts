export class TabPanel extends HTMLElement {
    connectedCallback() {
        this.setAttribute('role', 'tabpanel');

        // Ensure ID exists
        const panelId = this.id;
        if (!panelId) return;

        // Find matching tab in any <tab-list>
        const tab = document.querySelector(`tab-list [role="tab"][aria-controls="${panelId}"]`);

        if (tab.getAttribute('aria-selected') === 'true') {
            this.select();
        }
        else {
            this.deselect();
        }
        if (tab) {
            this.setAttribute('aria-labelledby', tab.id);
        } else {
            console.warn(`No matching tab found for panel #${panelId}`);
        }
    }

    select() {
        this.hidden = false;
    }

    deselect() {
        this.hidden = true;
    }
}

customElements.define('tab-panel', TabPanel);
