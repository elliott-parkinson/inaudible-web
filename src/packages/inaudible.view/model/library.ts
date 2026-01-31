import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { StoredDownload } from "../../inaudible.store/interfaces/stored-download";
import type { BookItem } from "./books";
import type { SeriesItem } from "./series";
import type { InaudibleService } from "../../inaudible.service";

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

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            const result = await inaudible.myLibrary.listLibrary();
            books.value = result.books;
            series.value = result.series;
            downloads.value = result.downloads;
            storage.value = result.storage;
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load library";
        } finally {
            loading.value = false;
        }
    };

    return { books, series, downloads, storage, loading, error, load };
};

export default {
    list: libraryList(),
};
