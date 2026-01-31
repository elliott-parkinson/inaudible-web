import { buildApiUrl } from "./helper/api-url";
import type { AudiobookshelfApi } from "../audiobookshelf.api/service";
import type { AuthorStore } from "../inaudible.store/store/authors-store";
import type { BookStore } from "../inaudible.store/store/books-store";
import type { DownloadsStore } from "../inaudible.store/store/downloads-store";
import type { MyLibraryStore } from "../inaudible.store/store/my-library-store";
import type { ProgressStore } from "../inaudible.store/store/progress-store";
import type { SeriesStore } from "../inaudible.store/store/series-store";
import type { AuthorItem, Book, BookItem, SeriesItem } from "./types/library";

export class LibraryService {
    private container: Map<string, object>;

    constructor(container: Map<string, object>) {
        this.container = container;
    }

    private getApi() {
        return this.container.get("audiobookshelf.api") as AudiobookshelfApi;
    }

    private async getProgressMap() {
        const progressStore = this.container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        return new Map(progressItems.map(item => [item.libraryItemId, item]));
    }

    async getLatestBooks(_request: { page: number; limit: number }): Promise<BookItem[]> {
        const api = this.getApi();
        const store = this.container.get("inaudible.store.books") as BookStore;
        const progressMap = await this.getProgressMap();
        const books = await store.getRecentlyAdded(8);

        return books.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(api, `items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        }));
    }

    async getBookList(request: { page: number; limit: number; searchTerm?: string }): Promise<BookItem[]> {
        const api = this.getApi();
        const store = this.container.get("inaudible.store.books") as BookStore;
        const progressMap = await this.getProgressMap();
        let books = await store.getAll();
        books = books.filter(book => book.meta.seriesName == "");

        if (request.searchTerm) {
            const term = request.searchTerm.toLowerCase();
            books = books.filter(book => book.meta.title.toLowerCase().includes(term));
        }

        return books.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(api, `items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        }));
    }

    async getBookDetail(request: { page: number; limit: number; id: string }): Promise<Book | null> {
        const api = this.getApi();
        const store = this.container.get("inaudible.store.books") as BookStore;
        const progressStore = this.container.get("inaudible.store.progress") as ProgressStore;
        const downloadsStore = this.container.get("inaudible.store.downloads") as DownloadsStore;
        const libraryStore = this.container.get("inaudible.store.library") as MyLibraryStore;
        const seriesStore = this.container.get("inaudible.store.series") as SeriesStore;
        const authorStore = this.container.get("inaudible.store.authors") as AuthorStore;

        const book = await store.get(request.id);
        if (!book) {
            return null;
        }
        const progress = await progressStore.getByLibraryItemId(book.id);
        const inLibrary = await libraryStore.has(book.id);
        const downloaded = downloadsStore ? await downloadsStore.get(book.id) : null;
        const isDownloaded = !!downloaded?.tracks?.length;
        const progressMap = await this.getProgressMap();

        const series: Book["series"] = [];
        for await (let s of book.series) {
            const seriesItem = await seriesStore.get(s.id);
            const seriesBooks = await store.getBySeries(s.id);
            series.push({
                id: seriesItem.id,
                name: seriesItem.name,
                books: seriesBooks.map(bookItem => ({
                    id: bookItem.id,
                    name: bookItem.meta.title,
                    pictureUrl: buildApiUrl(api, `items/${bookItem.id}/cover`),
                    progress: progressMap.get(bookItem.id)?.progress ?? 0,
                    currentTime: progressMap.get(bookItem.id)?.currentTime ?? 0,
                })),
            });
        }

        const authors: Book["authors"] = [];
        for await (let authorId of book.authors) {
            const author = await authorStore.get(authorId);
            authors.push({
                id: author.id,
                name: author.name,
                pictureUrl: buildApiUrl(api, `authors/${author.id}/image`),
                books: (await store.getMoreByAuthor(author.id, 6)).map(bookItem => ({
                    id: bookItem.id,
                    name: bookItem.meta.title,
                    pictureUrl: buildApiUrl(api, `items/${bookItem.id}/cover`),
                    progress: progressMap.get(bookItem.id)?.progress ?? 0,
                    currentTime: progressMap.get(bookItem.id)?.currentTime ?? 0,
                })),
            });
        }

        const currentTime = progress?.currentTime ?? 0;
        const progressTime = progress?.progress ? progress.progress * book.duration : 0;
        const resumeTime = progressTime && Math.abs(progressTime - currentTime) > 120 ? progressTime : currentTime;

        return {
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            description: book.meta.description,
            duration: book.duration,
            progress: progress?.progress ?? 0,
            currentTime,
            resumeTime,
            inLibrary,
            isDownloaded,
            narrators: book.meta.narratorName.split(", "),
            published: book.meta.publishedYear !== "0" ? book.meta.publishedYear : null,
            genres: book.meta.genres,
            pictureUrl: buildApiUrl(api, `items/${book.id}/cover`),
            authors,
            series,
        };
    }

    async getSeriesList(request: { page: number; limit: number; searchTerm?: string }): Promise<SeriesItem[]> {
        const store = this.container.get("inaudible.store.series") as SeriesStore;
        const progressMap = await this.getProgressMap();
        let series = await store.getAll();

        if (request.searchTerm) {
            const term = request.searchTerm.toLowerCase();
            series = series.filter(item => item.name.toLowerCase().includes(term));
        }

        return series.map(item => ({
            id: item.id,
            name: item.name,
            books: {
                total: item.books.length,
                list: item.books.map(book => ({
                    id: book.id,
                    position: book.position,
                    name: book.name,
                    pictureUrl: book.pictureUrl,
                    progress: progressMap.get(book.id)?.progress ?? 0,
                    currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                })),
            },
        }));
    }

    async getSeriesDetail(request: { page: number; limit: number; id: string }): Promise<SeriesItem | null> {
        const api = this.getApi();
        const bookStore = this.container.get("inaudible.store.books") as BookStore;
        const seriesStore = this.container.get("inaudible.store.series") as SeriesStore;
        const authorStore = this.container.get("inaudible.store.authors") as AuthorStore;
        const progressMap = await this.getProgressMap();

        const series = await seriesStore.get(request.id);
        if (!series) {
            return null;
        }

        const genres = new Set<string>();
        const narrators = new Set<string>();
        const authors: SeriesItem["authors"] = [];
        let duration = 0;
        let description = "";
        let minPublished = 99999;
        let maxPublished = 0;

        for await (let book of series.books) {
            const fullBook = await bookStore.get(book.id);
            if (!fullBook) {
                continue;
            }
            if (!description) {
                description = fullBook.meta.description;
            }
            duration += fullBook.duration;

            const publishedYear = parseInt(fullBook.meta.publishedYear);
            if (!Number.isNaN(publishedYear)) {
                if (publishedYear < minPublished) minPublished = publishedYear;
                if (publishedYear > maxPublished) maxPublished = publishedYear;
            }

            fullBook.meta.narratorName.split(",").forEach(narrator => narrators.add(narrator.trim()));

            for await (let authorName of fullBook.authors) {
                const author = await authorStore.get(authorName);
                if (!author) {
                    continue;
                }
                if (!authors.find(a => a.id == author.id)) {
                    authors.push({
                        id: author.id,
                        name: author.name,
                        books: (await bookStore.getMoreByAuthor(author.id, 6)).map(bookItem => ({
                            id: bookItem.id,
                            name: bookItem.meta.title,
                            pictureUrl: buildApiUrl(api, `items/${bookItem.id}/cover`),
                        })),
                    });
                }
            }
            fullBook.meta.genres.forEach(genre => genres.add(genre));
        }

        const published = minPublished !== 99999 && maxPublished !== 0
            ? `${minPublished} - ${maxPublished}`
            : undefined;

        return {
            id: series.id,
            name: series.name,
            duration,
            description,
            published,
            authors,
            narrators: Array.from(narrators),
            genres: Array.from(genres),
            books: {
                total: series.books.length,
                list: series.books.map(book => ({
                    id: book.id,
                    name: book.name,
                    pictureUrl: book.pictureUrl,
                    position: book.position.toString(),
                    progress: progressMap.get(book.id)?.progress ?? 0,
                    currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                })),
            },
        };
    }

    async getAuthorList(request: { page: number; limit: number; searchTerm?: string }): Promise<AuthorItem[]> {
        const api = this.getApi();
        const store = this.container.get("inaudible.store.authors") as AuthorStore;
        let authors = await store.getAll();

        if (request.searchTerm) {
            const term = request.searchTerm.toLowerCase();
            authors = authors.filter(author => author.name.toLowerCase().includes(term));
        }

        return authors.map(author => ({
            id: author.id,
            numBooks: author.numBooks,
            name: author.name,
            pictureUrl: buildApiUrl(api, `authors/${author.id}/image`),
        }));
    }
}
