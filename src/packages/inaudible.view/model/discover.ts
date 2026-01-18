import { type Signal, signal } from "@preact/signals";
import { container } from "../../../container";
import { BookStore } from "../../inaudible.model/store/books-store";
import type { ProgressStore } from "../../inaudible.model/store/progress-store";
import type { BookItem } from "./books";
import { buildApiUrl } from "./api";


export const latestBooks = () => {
	const discover = signal<BookItem[]>([]);
    const latest = signal<BookItem[]>([]);
    const continueListening = signal<BookItem[]>([]);
    const categories = signal<{ name: string; books: BookItem[] }[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const shuffle = <T,>(items: T[]) => {
        const list = [...items];
        for (let i = list.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    };

    const load = async (request: { page: number; limit: number }) => {
        loading.value = true;
        error.value = null;
        latest.value = [];
        categories.value = [];

        const store = container.get("inaudible.store.books") as BookStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        const allBooks = await store.getAll();
        const booksById = new Map(allBooks.map(book => [book.id, book]));
        let discoverBooks = await store.getDiscover(6);

        discover.value = discoverBooks.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(`items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        }));

        let latestBooks = await store.getRecentlyAdded(6);

        latest.value = latestBooks.map(book => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(`items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        }));

        const startedItems = progressItems
            .filter(item => item.currentTime > 0 && !item.isFinished && item.progress < 1)
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .slice(0, 6)
            .map(item => {
                const book = booksById.get(item.libraryItemId);
                if (!book) {
                    return null;
                }
                return {
                    id: book.id,
                    ino: book.ino,
                    name: book.meta.title,
                    pictureUrl: buildApiUrl(`items/${book.id}/cover`),
                    progress: item.progress ?? 0,
                    currentTime: item.currentTime ?? 0,
                } as BookItem;
            })
            .filter(Boolean) as BookItem[];

        continueListening.value = startedItems;

        const genreMap = new Map<string, BookItem[]>();
        allBooks.forEach(book => {
            const genres = book.meta.genres ?? [];
            genres.forEach(genre => {
                if (!genre) {
                    return;
                }
                const list = genreMap.get(genre) ?? [];
                list.push({
                    id: book.id,
                    ino: book.ino,
                    name: book.meta.title,
                    pictureUrl: buildApiUrl(`items/${book.id}/cover`),
                    progress: progressMap.get(book.id)?.progress ?? 0,
                    currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                });
                genreMap.set(genre, list);
            });
        });

        const categoryPool = shuffle(Array.from(genreMap.entries()));
        categories.value = categoryPool
            .slice(0, 6)
            .map(([name, books]) => ({
                name,
                books: shuffle(books).slice(0, 10),
            }));

        loading.value = false;
    };

    return { discover, latest, continueListening, categories, loading, error, load }
}

export default {
    discover: latestBooks(),
}
