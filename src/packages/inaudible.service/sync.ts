import type { LibraryAuthor } from "../audiobookshelf.api/interfaces/model/library-author";
import type { LibraryItem } from "../audiobookshelf.api/interfaces/model/library-item";
import type { LibrarySeries } from "../audiobookshelf.api/interfaces/model/library-series";
import type { AudiobookshelfApi } from "../audiobookshelf.api/service";
import type { Libraries } from "../audiobookshelf.api/service/libraries";
import type { AuthorStore } from "../inaudible.model/store/authors-store";
import type { BookStore } from "../inaudible.model/store/books-store";
import type { SeriesStore } from "../inaudible.model/store/series-store";
import { AudiobookshelfToInaudibleDataAdapter } from "./helper/data-adapter";


export class InaudibleSynchronizationService extends EventTarget {
    _container: Map<string, object>;
    _lastPercent: number = 0;

    constructor(container: Map<string, object>) {
        super();
        this._container = container;
    }

    private async fetchAll(defaultLibrary: string) {
        const libraries = this._container.get("audiobookshelf.api.libraries") as Libraries;

        const fetchedAuthors = await libraries.authors({
            libraryId: defaultLibrary,
            include: [],
            page: 0,
            limit: 0,
            minified: true,
        });

        const fetchedSeries = await libraries.series({
            libraryId: defaultLibrary,
            include: [],
            page: 0,
            limit: 800,
            minified: true,
        });

        const fetchedBooks = await libraries.items({
            libraryId: defaultLibrary,
            include: [],
            page: 0,
            limit: 0,
            collapseSeries: false,
            minified: true,
        });

        return {
            authors: fetchedAuthors.authors,
            series: fetchedSeries.results,
            books: fetchedBooks.results
        };
    }

    private async processFetchedData(fetched: {
        authors: LibraryAuthor[],
        series: LibrarySeries[],
        books: LibraryItem[],
    }) {
        const books = this._container.get("inaudible.store.books") as BookStore;
        const authors = this._container.get("inaudible.store.authors") as AuthorStore;
        const seriesStore = this._container.get("inaudible.store.series") as SeriesStore;
        const adapter = new AudiobookshelfToInaudibleDataAdapter(this._container);

        const totals = {
            authors: fetched.authors.length,
            series: fetched.series.length,
            books: fetched.books.length,
        };

        const total = totals.authors + totals.series + totals.books;

        fetched.authors.forEach(async (item: LibraryAuthor, index: number) => {
            const author = adapter.author(item);
            await authors.put(author);

            this.updateProgress(total, index);
        });
        
        fetched.series.forEach(async (item: LibrarySeries, index: number) => {
            const series = adapter.series(item);
            await seriesStore.put(series);

            this.updateProgress(total, totals.authors + index);
        });

        fetched.books.forEach(async (item: LibraryItem, index: number) => {
            if (item.mediaType == "book") {
                try {
                    const book = adapter.book(item);
                    const authorlist = book.meta.authorName.split(', ');

                    for await (let name of authorlist) {
                        const author = await authors.getByName(name);
                        book.authors.push(author.id);
                    }

                    const seriesList = book.meta.seriesName?.split(', ');
                    for await (let name of seriesList) {
                        const seriesName = name.split("#")[0].trim();
                        const series = await seriesStore.getByName(seriesName);
                        if (series) {
                            book.series.push({
                                id: series.id,
                                position: name.split("#")[1]
                            });
                        }
                    }

                    await books.put(book);

                    this.updateProgress(total, totals.authors + totals.series + index);
                }
                catch (exception) {
                    console.error("Error storing", item.media.metadata.title);
                    console.error(exception);
                }
            }
            else {
                console.log(item.mediaType, item.media.metadata.title)
            }
        });
    }
    
    private async cacheCoversAndImages() {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        const books = this._container.get("inaudible.store.books") as BookStore;
        const authors = this._container.get("inaudible.store.authors") as AuthorStore;

        (await authors.getAll()).forEach(author => fetch(`${api.getBaseUrl()}/audiobookshelf/api/authors/${author.id}/image`));
        (await books.getAll()).forEach(book => fetch(`${api.getBaseUrl()}/audiobookshelf/api/items/${book.id}/cover`));
    }

    async synchronize(defaultLibrary: string) {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        const libraries = this._container.get("audiobookshelf.api.libraries") as Libraries;

        const mylibrary = await libraries.mediaProgress({});
        this._lastPercent = 0;

        const currentTime = Date.now();
        const lastSync = parseInt(localStorage.getItem("inaudible.lastsync") ?? "0");


        const fetched = await this.fetchAll(defaultLibrary);
        await this.processFetchedData(fetched);
        
        this.cacheCoversAndImages();

        localStorage.setItem("inaudible.lastsync", Date.now().toString());
    }

    updateProgress(total: number, complete: number) {
        const percent = total > 0 ? Math.floor((complete / total) * 100) : 0;

        if (percent < this._lastPercent) return;
        this._lastPercent = percent;

        this.dispatchEvent(new CustomEvent("progress", { detail: {
            total, complete, percent
        } }));
    }
}
