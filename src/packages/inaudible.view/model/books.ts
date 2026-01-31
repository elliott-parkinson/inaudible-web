import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { Book, BookItem } from "../../inaudible.service/types/library";

export type { Book, BookItem };

export const latestBooks = () => {
    const data = signal<BookItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number }) => {
        loading.value = true;
        error.value = null;
        data.value = [];

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            data.value = await inaudible.library.getLatestBooks(request);
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load books";
        } finally {
            loading.value = false;
        }
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

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            data.value = await inaudible.library.getBookList(request);
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load books";
        } finally {
            loading.value = false;
        }
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

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            data.value = await inaudible.library.getBookDetail(request);
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load book";
        } finally {
            loading.value = false;
        }
    };

    return { data, loading, error, load }
}


export default {
    list: bookList(),
    latest: latestBooks(),
    one: bookOne(),
}
