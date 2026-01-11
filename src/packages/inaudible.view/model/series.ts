import { type Signal, signal } from "@preact/signals";
import { container } from "../../../container";
import type { SeriesStore } from "src/packages/inaudible.model/store/series-store";
import type { AuthorStore } from "src/packages/inaudible.model/store/authors-store";
import type { BookStore } from "src/packages/inaudible.model/store/books-store";
import type { ProgressStore } from "src/packages/inaudible.model/store/progress-store";


export interface SeriesItem {
    id: string,
    name: string,
    genres: string[],
    duration: number,
    description: string,
    published: string,
    narrators: string[],
    authors: {
        id: string,
        name: string,
        books: {
            id: string,
            name: string,
            pictureUrl: string,
        }[]
    }[],
    books: {
        total: number,
        list: {
            id: string,
            position: string,
            name: string,
            pictureUrl: string,
            progress?: number,
            currentTime?: number,
        }[]
    }
}

export namespace SeriesList {
    export type Request = {
        page: number,
        limit: number,
        searchTerm?: string
    }
}


export const seriesList = () => {
    const data = signal<SeriesItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: SeriesList.Request) => {
        loading.value = true;
        error.value = null;
        data.value = [];

        const store = container.get("inaudible.store.series") as SeriesStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        let series = await store.getAll();
        loading.value = false;

        if (request.searchTerm) {
            series = series.filter(item => item.name.toLowerCase().includes(request.searchTerm.toLowerCase()))
        }

        data.value = series.map(item => ({
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
                }))
            },
        }))
    }

    return { data, loading, error, load }
}

export const seriesOne = () => {
    const data = signal<SeriesItem>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number, id: string }) => {
        loading.value = true;
        error.value = null;
        data.value = null;
        
        const bookStore = container.get("inaudible.store.books") as BookStore;
        const seriesStore = container.get("inaudible.store.series") as SeriesStore;
        const authorStore = container.get("inaudible.store.authors") as AuthorStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        let series = await seriesStore.get(request.id);

        let genres = new Set<string>();
        let narrators = new Set<string>();
        let authors = [];
        let duration = 0;
        let description = "";

        let minPublished = 99999;
        let maxPublished = 0;


        for await (let book of series.books) {
            const fullBook = await bookStore.get(book.id);
            if (description == "") {
                description = fullBook.meta.description;
            }
            duration += fullBook.duration;

            if (parseInt(fullBook.meta.publishedYear) < minPublished) minPublished = parseInt(fullBook.meta.publishedYear);
            if (parseInt(fullBook.meta.publishedYear) > maxPublished) maxPublished = parseInt(fullBook.meta.publishedYear);

            fullBook.meta.narratorName.split(",").forEach(narrator => narrators.add(narrator));

            for await (let authorName of fullBook.authors) {
                const author = await authorStore.get(authorName);
                if (!authors.find(a => a.id == author.id)) {
                    authors.push({
                        id: author.id,
                        name: author.name,
                        books: (await bookStore.getMoreByAuthor(author.id, 6)).map(book => ({
                            id: book.id,
                            name: book.meta.title,
                            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`,
                        })),
                    });
                }
            }
            fullBook.meta.genres.forEach(genre => genres.add(genre));
        }

        loading.value = false;

        data.value = {
            id: series.id,
            name: series.name,
            duration,
            description,
            published: `${minPublished} - ${maxPublished}`,
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
                }))
            },
        };

    };

    return { data, loading, error, load }
}

export default {
    list: seriesList(),
    one: seriesOne(),
}
