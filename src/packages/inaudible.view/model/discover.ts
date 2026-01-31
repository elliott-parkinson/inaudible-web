import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { BookItem } from "./books";


export const latestBooks = () => {
	const discover = signal<BookItem[]>([]);
    const latest = signal<BookItem[]>([]);
    const continueListening = signal<BookItem[]>([]);
    const categories = signal<{ name: string; books: BookItem[] }[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number }) => {
        loading.value = true;
        error.value = null;
        latest.value = [];
        categories.value = [];
        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            const result = await inaudible.discover.getOverview(request);
            discover.value = result.discover;
            latest.value = result.latest;
            continueListening.value = result.continueListening;
            categories.value = result.categories;
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load discovery";
        } finally {
            loading.value = false;
        }
    };

    return { discover, latest, continueListening, categories, loading, error, load }
}

export default {
    discover: latestBooks(),
}
