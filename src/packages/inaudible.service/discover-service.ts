import { buildApiUrl } from "./helper/api-url";
import type { BookItem } from "./types/library";
import type { BookStore } from "../inaudible.store/store/books-store";
import type { ProgressStore } from "../inaudible.store/store/progress-store";
import type { AudiobookshelfApi } from "../audiobookshelf.api/service";

export class DiscoverService {
    private container: Map<string, object>;

    constructor(container: Map<string, object>) {
        this.container = container;
    }

    private shuffle<T>(items: T[]) {
        const list = [...items];
        for (let i = list.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    }

    async getOverview(_request: { page: number; limit: number }) {
        const api = this.container.get("audiobookshelf.api") as AudiobookshelfApi;
        const store = this.container.get("inaudible.store.books") as BookStore;
        const progressStore = this.container.get("inaudible.store.progress") as ProgressStore;

        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        const allBooks = await store.getAll();
        const booksById = new Map(allBooks.map(book => [book.id, book]));

        const toBookItem = (book: any): BookItem => ({
            id: book.id,
            ino: book.ino,
            name: book.meta.title,
            pictureUrl: buildApiUrl(api, `items/${book.id}/cover`),
            progress: progressMap.get(book.id)?.progress ?? 0,
            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
        });

        const discoverBooks = await store.getDiscover(6);
        const latestBooks = await store.getRecentlyAdded(6);

        const startedItems = progressItems
            .filter(item => item.currentTime >= 30 && !item.isFinished && item.progress < 1)
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .slice(0, 6)
            .map(item => {
                const book = booksById.get(item.libraryItemId);
                return book ? toBookItem(book) : null;
            })
            .filter(Boolean) as BookItem[];

        const genreMap = new Map<string, BookItem[]>();
        allBooks.forEach(book => {
            const genres = book.meta.genres ?? [];
            genres.forEach(genre => {
                if (!genre) {
                    return;
                }
                const list = genreMap.get(genre) ?? [];
                list.push(toBookItem(book));
                genreMap.set(genre, list);
            });
        });

        const categoryPool = this.shuffle(Array.from(genreMap.entries()));
        const categories = categoryPool
            .slice(0, 6)
            .map(([name, books]) => ({
                name,
                books: this.shuffle(books).slice(0, 10),
            }));

        return {
            discover: discoverBooks.map(toBookItem),
            latest: latestBooks.map(toBookItem),
            continueListening: startedItems,
            categories,
        };
    }
}
