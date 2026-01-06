import { type Signal, signal } from "@preact/signals";
import { container } from "../../../container";
import { BookStore } from "../../inaudible.model/store/books-store";
import type { AuthorStore } from "../../inaudible.model/store/authors-store";
import type { SeriesStore } from "../../inaudible.model/store/series-store";

export interface Book {
    id: string,
    ino: string,
    name: string,
    description: string,
    pictureUrl: string,
    duration: number,
    genres: string[],
    published: string,

    narrators: string[],

    series?: {
        id: string,
        name: string,
        books?: {
            id: string,
            name: string,
            pictureUrl: string,
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
        }[]
    }[]
}


export interface BookItem {
    id: string,
    ino?: string,
    name: string,
    pictureUrl: string,
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
        let books = await store.getRecentlyAdded(8);

        data.value = books.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`
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
        let books = await store.getAll();
        books = books.filter(book => book.meta.seriesName == "");

        if (request.searchTerm) {
            books = books.filter(book => book.meta.title.toLowerCase().includes(request.searchTerm.toLowerCase()))
        }

        data.value = books.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`
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
        const seriesStore = container.get("inaudible.store.series") as SeriesStore;
        const authorStore = container.get("inaudible.store.authors") as AuthorStore;
        let book = await store.get(request.id);


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
                    pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`,
                }))
            });
        }

        const authors = [];
        for await (let authorId of book.authors) {
            const author = await authorStore.get(authorId);
            authors.push({
                id: author.id,
                name: author.name,
                pictureUrl: `https://audible.hylia.network/audiobookshelf/api/authors/${author.id}/image`,
                books: (await store.getMoreByAuthor(author.id, 6)).map(book => ({
                    id: book.id,
                    name: book.meta.title,
                    pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`,
                })),
            })
        }
        loading.value = false;

        data.value = {
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            description: book.meta.description,
            duration: book.duration,
            narrators: book.meta.narratorName.split(", "),
            published: book.meta.publishedYear !== "0" ? book.meta.publishedYear : null,
            genres: book.meta.genres,
            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`,
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
