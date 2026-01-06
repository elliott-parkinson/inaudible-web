class AudiobookSeriesElement extends HTMLElement {
    static get observedAttributes() {
        return ['position', 'src', 'title'];
    }

    #root = this.attachShadow({ mode: 'open' });

    connectedCallback() {
        this.#render();
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (oldVal !== newVal) this.#render();
    }

    #render() {
        const position = this.getAttribute('position');
        const src = this.getAttribute('src');
        const title = this.getAttribute('title');

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
            }
        </style>
        <figure class="book">
        	${position ? `<span class="position">${position}</span>` : ''}
            <picture>
                <img src="${src}" alt="${title}" />
            </picture>
            <figcaption>${title}</figcaption>
        </figure>
        `;
    }
}

customElements.define('inaudible-series', AudiobookSeriesElement);
