import { type Signal, signal } from "@preact/signals";
import { container } from "../../../container";
import { BookStore } from "../../inaudible.model/store/books-store";
import type { AuthorStore } from "../../inaudible.model/store/authors-store";
import type { SeriesStore } from "../../inaudible.model/store/series-store";
import type { ProgressStore } from "../../inaudible.model/store/progress-store";
import type { MyLibraryStore } from "../../inaudible.model/store/my-library-store";
import { buildApiUrl } from "./api";

export interface Book {
    id: string,
    ino: string,
    name: string,
    description: string,
    pictureUrl: string,
    duration: number,
    genres: string[],
    published: string,
    progress?: number,
    currentTime?: number,
    resumeTime?: number,
    inLibrary?: boolean,
    isDownloaded?: boolean,

    narrators: string[],

    series?: {
        id: string,
        name: string,
        books?: {
            id: string,
            name: string,
            pictureUrl: string,
            progress?: number,
            currentTime?: number,
        }[]
    }[]

    authors?: {
        id: string,
        name: string,
        pictureUrl: string,
        books?: {
            id: string,
            name: string,
            pictureUrl: string,
            progress?: number,
            currentTime?: number,
        }[]
    }[]
}


export interface BookItem {
    id: string,
    ino?: string,
    name: string,
    pictureUrl: string,
    progress?: number,
    currentTime?: number,
}

export const latestBooks = () => {
    const data = signal<BookItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number }) => {
        loading.value = true;
        error.value = null;
        data.value = [];

        const store = container.get("inaudible.store.books") as BookStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        let books = await store.getRecentlyAdded(8);

        data.value = books.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(`items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        }));

        loading.value = false;
    };

    return { data, loading, error, load }
}

export const bookList = () => {
    const data = signal<BookItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number, searchTerm?: string }) => {
        loading.value = true;
        error.value = null;
        data.value = [];

        const store = container.get("inaudible.store.books") as BookStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        let books = await store.getAll();
        books = books.filter(book => book.meta.seriesName == "");

        if (request.searchTerm) {
            books = books.filter(book => book.meta.title.toLowerCase().includes(request.searchTerm.toLowerCase()))
        }

        data.value = books.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(`items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        }));

        loading.value = false;
    };

    return { data, loading, error, load }
}


export const bookOne = () => {
    const data = signal<Book>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number, id: string }) => {
        loading.value = true;
        error.value = null;
        data.value = null;

        const store = container.get("inaudible.store.books") as BookStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const downloadsStore = container.get("inaudible.store.downloads") as any;
        const libraryStore = container.get("inaudible.store.library") as MyLibraryStore;
        const seriesStore = container.get("inaudible.store.series") as SeriesStore;
        const authorStore = container.get("inaudible.store.authors") as AuthorStore;
        let book = await store.get(request.id);
        const progress = await progressStore.getByLibraryItemId(book.id);
        const inLibrary = await libraryStore.has(book.id);
        const downloaded = downloadsStore ? await downloadsStore.get(book.id) : null;
        const isDownloaded = !!downloaded?.tracks?.length;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));


        const series = [];
        for await (let s of book.series) {
            const seriesItem = await seriesStore.get(s.id);
            const seriesBooks = await store.getBySeries(s.id);
            series.push({
                id: seriesItem.id,
                name: seriesItem.name,
                books: seriesBooks.map(book => ({
                    id: book.id,
                    name: book.meta.title,
                    pictureUrl: buildApiUrl(`items/${book.id}/cover`),
                    progress: progressMap.get(book.id)?.progress ?? 0,
                    currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                }))
            });
        }

        const authors = [];
        for await (let authorId of book.authors) {
            const author = await authorStore.get(authorId);
            authors.push({
                id: author.id,
                name: author.name,
                pictureUrl: buildApiUrl(`authors/${author.id}/image`),
                books: (await store.getMoreByAuthor(author.id, 6)).map(book => ({
                    id: book.id,
                    name: book.meta.title,
                    pictureUrl: buildApiUrl(`items/${book.id}/cover`),
                    progress: progressMap.get(book.id)?.progress ?? 0,
                    currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                })),
            })
        }
        loading.value = false;

        const currentTime = progress?.currentTime ?? 0;
        const progressTime = progress?.progress ? progress.progress * book.duration : 0;
        const resumeTime = progressTime && Math.abs(progressTime - currentTime) > 120 ? progressTime : currentTime;
        data.value = {
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
            pictureUrl: buildApiUrl(`items/${book.id}/cover`),
            authors,

            series,
        };
    };

    return { data, loading, error, load }
}


export default {
    list: bookList(),
    latest: latestBooks(),
    one: bookOne(),
}
