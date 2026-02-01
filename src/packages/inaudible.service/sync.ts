import type { LibraryAuthor } from "../audiobookshelf.api/interfaces/model/library-author";
import type { LibraryItem } from "../audiobookshelf.api/interfaces/model/library-item";
import type { LibrarySeries } from "../audiobookshelf.api/interfaces/model/library-series";
import type { AudiobookshelfApi } from "../audiobookshelf.api/service";
import type { Libraries } from "../audiobookshelf.api/service/libraries";
import type { AuthorStore } from "../inaudible.store/store/authors-store";
import type { BookStore } from "../inaudible.store/store/books-store";
import type { SeriesStore } from "../inaudible.store/store/series-store";
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

        for (let index = 0; index < fetched.authors.length; index += 1) {
            const item = fetched.authors[index];
            const author = adapter.author(item);
            await authors.put(author);

            this.updateProgress(total, index);
        }

        for (let index = 0; index < fetched.series.length; index += 1) {
            const item = fetched.series[index];
            const series = adapter.series(item);
            await seriesStore.put(series);

            this.updateProgress(total, totals.authors + index);
        }

        for (let index = 0; index < fetched.books.length; index += 1) {
            const item = fetched.books[index];
            if (item.mediaType == "book") {
                try {
                    const book = adapter.book(item);
                    const authorlist = book.meta.authorName.split(', ');

                    for await (let name of authorlist) {
                        const author = await authors.getByName(name);
                        if (author?.id) {
                            book.authors.push(author.id);
                        }
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
        }
    }
    
    private async cacheCoversAndImages() {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        const books = this._container.get("inaudible.store.books") as BookStore;
        const authors = this._container.get("inaudible.store.authors") as AuthorStore;

        (await authors.getAll()).forEach(author => fetch(`${api.getBaseUrl()}/audiobookshelf/api/authors/${author.id}/image`));
        (await books.getAll()).forEach(book => fetch(`${api.getBaseUrl()}/audiobookshelf/api/items/${book.id}/cover`));
    }

    private async hasItem(store: { get: (id: string) => Promise<any> }, id: string): Promise<boolean> {
        if (!id) {
            return false;
        }
        const found = await store.get(id);
        return !!found;
    }

    private async fetchAuthorsPage(libraries: Libraries, libraryId: string, page: number, limit: number) {
        const response = await libraries.authors({
            libraryId,
            include: [],
            page,
            limit,
            minified: true,
        });
        return response.authors ?? [];
    }

    private async fetchSeriesPage(libraries: Libraries, libraryId: string, page: number, limit: number) {
        const response = await libraries.series({
            libraryId,
            include: [],
            page,
            limit,
            minified: true,
        });
        return response.results ?? [];
    }

    private async fetchBooksPage(libraries: Libraries, libraryId: string, page: number, limit: number) {
        const response = await libraries.items({
            libraryId,
            include: [],
            page,
            limit,
            collapseSeries: false,
            minified: true,
        });
        return response.results ?? [];
    }

    private async collectMissing<T extends { id: string }>(
        fetchPage: (page: number, limit: number) => Promise<T[]>,
        hasItem: (id: string) => Promise<boolean>,
    ): Promise<T[] | null> {
        let page = 0;
        let limit = 5;
        const collected: T[] = [];

        while (true) {
            const batch = await fetchPage(page, limit);
            if (!batch.length) {
                return collected.length ? collected : null;
            }
            collected.push(...batch);

            const first = collected[0];
            const last = collected[collected.length - 1];
            const hasFirst = first ? await hasItem(first.id) : false;
            const hasLast = last ? await hasItem(last.id) : false;

            if (hasFirst && hasLast) {
                return null;
            }
            if (!hasFirst && hasLast) {
                return collected;
            }

            page += 1;
            limit = 10;
        }
    }

    async synchronizePartial(defaultLibrary: string) {
        console.info("Starting partial synchronization...");
        const libraries = this._container.get("audiobookshelf.api.libraries") as Libraries;
        const books = this._container.get("inaudible.store.books") as BookStore;
        const authors = this._container.get("inaudible.store.authors") as AuthorStore;
        const seriesStore = this._container.get("inaudible.store.series") as SeriesStore;

        const [authorsToSync, seriesToSync, booksToSync] = await Promise.all([
            this.collectMissing<LibraryAuthor>(
                (page, limit) => this.fetchAuthorsPage(libraries, defaultLibrary, page, limit),
                (id) => this.hasItem(authors, id)
            ),
            this.collectMissing<LibrarySeries>(
                (page, limit) => this.fetchSeriesPage(libraries, defaultLibrary, page, limit),
                (id) => this.hasItem(seriesStore, id)
            ),
            this.collectMissing<LibraryItem>(
                (page, limit) => this.fetchBooksPage(libraries, defaultLibrary, page, limit),
                (id) => this.hasItem(books, id)
            ),
        ]);

        if (!authorsToSync && !seriesToSync && !booksToSync) {
            return;
        }

        await this.processFetchedData({
            authors: authorsToSync ?? [],
            series: seriesToSync ?? [],
            books: booksToSync ?? [],
        });
    }

    async synchronize(defaultLibrary: string) {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        const libraries = this._container.get("audiobookshelf.api.libraries") as Libraries;
        const progressStore = this._container.get("inaudible.store.progress") as any;
        const libraryStore = this._container.get("inaudible.store.library") as any;

        const mylibrary = await libraries.mediaProgress({});
        this._lastPercent = 0;

        const currentTime = Date.now();
        const lastSync = parseInt(localStorage.getItem("inaudible.lastsync") ?? "0");


        const fetched = await this.fetchAll(defaultLibrary);
        await this.processFetchedData(fetched);
        
        this.cacheCoversAndImages();
        if (progressStore && libraryStore) {
            const progressItems = await progressStore.getAll();
            const now = Date.now();
            if (progressItems?.length) {
                await libraryStore.putMany(progressItems.map((item: any) => ({
                    id: item.libraryItemId,
                    addedAt: item.startedAt ?? item.updatedAt ?? item.lastUpdate ?? now,
                    updatedAt: item.updatedAt ?? item.lastUpdate ?? now,
                })));
            }
        }

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
