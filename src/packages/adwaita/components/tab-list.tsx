import type { TabPanel } from "./tab-panel";

export class TabList extends HTMLElement {
    connectedCallback() {
        this.setAttribute('role', 'tablist');
        this._setupTabs();
    }

    _setupTabs() {
        const tabs = this.querySelectorAll('[role="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this._activateTab(tab));
            // Ensure initial state
            if (tab.getAttribute('aria-selected') === 'true') {
                this._activateTab(tab, true);
            }
            else {
                //this._activateTab(tab, false);
            }
        });
    }

    _activateTab(selectedTab, fireEvent = true) {
        const tabs = this.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
        tabs.forEach(tab => {
            tab.setAttribute('aria-selected', 'false');
            tab.classList.remove('active');
        });

        selectedTab.setAttribute('aria-selected', 'true');
        selectedTab.classList.add('active');

        const panelId = selectedTab.getAttribute('aria-controls');
        const panels = document.querySelectorAll('[role="tabpanel"]') as NodeListOf<TabPanel>;
        panels.forEach((panel: TabPanel) => {
            panel.deselect();
        });

        const activePanel = document.getElementById(panelId) as TabPanel;
        if (activePanel) {
            activePanel.select();
        }

        if (fireEvent) {
            this.dispatchEvent(new CustomEvent('change', {
                detail: { value: selectedTab.id },
                bubbles: true,
                composed: true
            }));
        }
    }
}

customElements.define('tab-list', TabList);
