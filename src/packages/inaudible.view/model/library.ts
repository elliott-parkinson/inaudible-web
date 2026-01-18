import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { BookStore } from "../../inaudible.model/store/books-store";
import type { ProgressStore } from "../../inaudible.model/store/progress-store";
import type { MyLibraryStore } from "../../inaudible.model/store/my-library-store";
import type { DownloadsStore } from "../../inaudible.model/store/downloads-store";
import type { StoredDownload } from "../../inaudible.model/interfaces/stored-download";
import type { SeriesStore } from "../../inaudible.model/store/series-store";
import type { BookItem } from "./books";
import type { SeriesItem } from "./series";
import { buildApiUrl } from "./api";

export const libraryList = () => {
    const books = signal<BookItem[]>([]);
    const series = signal<SeriesItem[]>([]);
    const downloads = signal<StoredDownload[]>([]);
    const storage = signal<{ used: number; quota: number } | null>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async () => {
        loading.value = true;
        error.value = null;
        books.value = [];
        series.value = [];
        downloads.value = [];
        storage.value = null;

        const bookStore = container.get("inaudible.store.books") as BookStore;
        const progressStore = container.get("inaudible.store.progress") as ProgressStore;
        const libraryStore = container.get("inaudible.store.library") as MyLibraryStore;
        const downloadsStore = container.get("inaudible.store.downloads") as DownloadsStore;
        const seriesStore = container.get("inaudible.store.series") as SeriesStore;

        const libraryItems = await libraryStore.getAll();
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        const allBooks = await bookStore.getAll();
        const booksById = new Map(allBooks.map(book => [book.id, book]));

        const sortedLibrary = [...libraryItems].sort((a, b) => {
            const aTime = a.updatedAt ?? a.addedAt ?? 0;
            const bTime = b.updatedAt ?? b.addedAt ?? 0;
            return bTime - aTime;
        });

        const seriesIds = new Set<string>();
        sortedLibrary.forEach(item => {
            const stored = booksById.get(item.id);
            stored?.series?.forEach(seriesItem => seriesIds.add(seriesItem.id));
        });

        books.value = sortedLibrary
            .map(item => {
                const book = booksById.get(item.id);
                if (!book || (book.series && book.series.length > 0)) {
                    return null;
                }
                const progressItem = progressMap.get(book.id);
                return {
                    id: book.id,
                    ino: book.ino,
                    name: book.meta.title,
                    pictureUrl: buildApiUrl(`items/${book.id}/cover`),
                    progress: progressItem?.progress ?? 0,
                    currentTime: progressItem?.currentTime ?? 0,
                } as BookItem;
            })
            .filter(Boolean) as BookItem[];

        const seriesItems = await Promise.all(
            Array.from(seriesIds).map(async (seriesId) => {
                const seriesEntry = await seriesStore.get(seriesId);
                if (!seriesEntry) {
                    return null;
                }
                return {
                    id: seriesEntry.id,
                    name: seriesEntry.name,
                    books: {
                        total: seriesEntry.books.length,
                        list: seriesEntry.books.map(book => ({
                            id: book.id,
                            position: book.position,
                            name: book.name,
                            pictureUrl: book.pictureUrl,
                            progress: progressMap.get(book.id)?.progress ?? 0,
                            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                        }))
                    },
                } as SeriesItem;
            })
        );

        series.value = seriesItems.filter(Boolean) as SeriesItem[];
        downloads.value = await downloadsStore.getAll();

        if (navigator.storage?.estimate) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate?.usage;
            const quota = estimate?.quota;
            if (typeof usage === 'number' && typeof quota === 'number') {
                storage.value = {
                    used: usage,
                    quota: quota,
                };
            }
        }
        loading.value = false;
    };

    return { books, series, downloads, storage, loading, error, load };
};

export default {
    list: libraryList(),
};
