import { type Signal, signal } from "@preact/signals";
import { container } from "../../../container";
import type { BookStore } from "src/packages/inaudible.model/store/books-store";
import type { AuthorStore } from "src/packages/inaudible.model/store/authors-store";
import type { SeriesItem } from "./series";
import type { SeriesStore } from "src/packages/inaudible.model/store/series-store";
import type { ProgressStore } from "src/packages/inaudible.model/store/progress-store";


export interface AuthorItem {
    id: string,
    numBooks: number,
    name: string,
    pictureUrl: string,
}

export const authorList = () => {
    const data = signal<AuthorItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number, searchTerm?: string }) => {
        loading.value = true;
        error.value = null;
        data.value = [];

        const store = container.get("inaudible.store.authors") as AuthorStore;
        let authors = await store.getAll();
        loading.value = false;

        if (request.searchTerm) {
            authors = authors.filter(author => author.name.toLowerCase().includes(request.searchTerm.toLowerCase()))
        }

        data.value = authors.map(author => ({
            id: author.id,
            numBooks: author.numBooks,
            name: author.name,
            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/authors/${author.id}/image`,
        }));
    };

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
        
        const seriesStore = container.get("inaudible.store.series") as SeriesStore;
        const authorStore = container.get("inaudible.store.authors") as AuthorStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        let series = await seriesStore.get(request.id);
        console.info('series', series)

        loading.value = false;

        data.value = {
            id: series.id,
            name: series.name,
            books: {
                total: series.books.length,
                list: series.books.map(book => ({
                    id: book.id,
                    name: book.name,
                    pictureUrl: book.pictureUrl,
                    position: '0',
                    progress: progressMap.get(book.id)?.progress ?? 0,
                    currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                }))
            },
        };

    };

    return { data, loading, error, load }
}


export default {
    list: authorList(),
    one: seriesOne(),
}
