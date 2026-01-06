import type { container } from "src/container";
import type { LibraryAuthor } from "../audiobookshelf.api/interfaces/model/library-author";
import type { LibraryItem } from "../audiobookshelf.api/interfaces/model/library-item";
import type { LibrarySeries } from "../audiobookshelf.api/interfaces/model/library-series";
import type { AudiobookshelfApi } from "../audiobookshelf.api/service";
import type { Libraries } from "../audiobookshelf.api/service/libraries";
import type { StoredSeries } from "../inaudible.model/interfaces/stored-series";
import type { AuthorStore } from "../inaudible.model/store/authors-store";
import type { BookStore } from "../inaudible.model/store/books-store";
import type { SeriesStore } from "../inaudible.model/store/series-store";
import type { StoredAuthor } from "../inaudible.model/interfaces/stored-author";
import type { StoredBook } from "../inaudible.model/interfaces/stored-book";

export class AudiobookshelfToInaudibleDataAdapter {
    book(book: LibraryItem): StoredBook {
        return {
            id: book.id,
            ino: book.ino,
            libraryId: book.libraryId,
            authors: [],

            series: [],

            addedAt: book.addedAt,
            updatedAt: book.updatedAt,
            isMissing: book.isMissing,
            isInvalid: book.isInvalid,
            isComplete: false,
            percentComplete: 0,

            meta: {
                title: book.media.metadata.title,
                subtitle: book.media.metadata.subtitle,
                authorName: book.media.metadata.authorName,
                narratorName: book.media.metadata.narratorName,
                seriesName: book.media.metadata.seriesName,
                genres: [...book.media.metadata.genres],
                publishedYear: book.media.metadata.publishedYear,
                publishedDate: book.media.metadata.publishedDate,
                publisher: book.media.metadata.publisher ,
                description: book.media.metadata.description,
                language: book.media.metadata.language,
                explicit: book.media.metadata.explicit,
                abridged: book.media.metadata.abridged,
            },
            tags: [...book.media.tags],
            duration: book.media.duration,
        }
    }

    author(author: LibraryAuthor): StoredAuthor {
        return {
            id: author.id,
            asin: author.asin,
            name: author.name,
            description: author.description,
            imagePath: author.imagePath,
            libraryId: author.libraryId,
            addedAt: author.addedAt,
            updatedAt: author.updatedAt,
            numBooks: author.numBooks,
        }
    }
}

export class InaudibleSynchronizationService extends EventTarget {
    _container: Map<string, object>;
    _lastPercent: number = 0;

    constructor(container: Map<string, object>) {
        super();
        this._container = container;
    }

    async synchronize(defaultLibrary: string) {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        const libraries = this._container.get("inaudible.api.libraries") as Libraries;

        const books = this._container.get("inaudible.store.books") as BookStore;
        const authors = this._container.get("inaudible.store.authors") as AuthorStore;
        const seriesStore = this._container.get("inaudible.store.series") as SeriesStore;
        const adapter = new AudiobookshelfToInaudibleDataAdapter;


        const mylibrary = await libraries.mediaProgress({});
		console.log('library', mylibrary);

        this._lastPercent = 0;

        const currentTime = Date.now();
        const lastSync = parseInt(localStorage.getItem("inaudible.lastsync") ?? "0");

        const fetched = {
            authors: [],
            series: [],
            books: []
        };


        const totals = {
            authors: 0,
            series: 0,
            books: 0,
        };


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

        fetched.authors = fetchedAuthors.authors;
        fetched.series = fetchedSeries.results;
        fetched.books = fetchedBooks.results;

        totals.authors = fetched.authors.length;
        totals.series = fetched.series.length;
        totals.books = fetched.books.length;


        const total = totals.authors + totals.series + totals.books;


        fetched.authors.forEach(async (item: LibraryAuthor, index: number) => {
            const author = adapter.author(item);
            await authors.put(author);

            this.updateProgress(total, index);
        });

        fetched.series.forEach(async (item: LibrarySeries, index: number) => {
            await seriesStore.put({
                id: item.id,
                name: item.nameIgnorePrefix,
                description: item.description,
                updatedAt: item.updatedAt,
                addedAt: item.addedAt,
                books: item.books.map(book => ({
                    id: book.id,
                    name: book.media.metadata.title,
                    position: book.media.metadata.seriesName.split("#")[1],
                    pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`
                }))

            } as StoredSeries);

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

        (await authors.getAll()).forEach(author => fetch(`https://audible.hylia.network/audiobookshelf/api/authors/${author.id}/image`));
        (await books.getAll()).forEach(book => fetch(`https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`));



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
