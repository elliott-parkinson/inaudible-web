import { type Signal, signal } from "@preact/signals";
import { container } from "../../../container";
import { BookStore } from "../../inaudible.model/store/books-store";
import type { BookItem } from "./books";


export const latestBooks = () => {
	const discover = signal<BookItem[]>([]);
    const latest = signal<BookItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number }) => {
        loading.value = true;
        error.value = null;
        latest.value = [];

        const store = container.get("inaudible.store.books") as BookStore;
        let discoverBooks = await store.getDiscover(6);

        discover.value = discoverBooks.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`
        }));

        let latestBooks = await store.getRecentlyAdded(6);

        latest.value = latestBooks.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: `https://audible.hylia.network/audiobookshelf/api/items/${book.id}/cover`
        }));

        loading.value = false;
    };

    return { discover, latest, loading, error, load }
}

export default {
    discover: latestBooks(),
}
