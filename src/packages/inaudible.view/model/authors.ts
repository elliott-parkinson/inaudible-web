import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { InaudibleService } from "../../inaudible.service";
import type { SeriesItem } from "./series";
import type { AuthorItem } from "../../inaudible.service/types/library";

export type { AuthorItem };

export const authorList = () => {
    const data = signal<AuthorItem[]>([]);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async (request: { page: number; limit: number, searchTerm?: string }) => {
        loading.value = true;
        error.value = null;
        data.value = [];

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            data.value = await inaudible.library.getAuthorList(request);
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load authors";
        } finally {
            loading.value = false;
        }
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
        
        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            data.value = await inaudible.library.getSeriesDetail(request);
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load series";
        } finally {
            loading.value = false;
        }

    };

    return { data, loading, error, load }
}


export default {
    list: authorList(),
    one: seriesOne(),
}
