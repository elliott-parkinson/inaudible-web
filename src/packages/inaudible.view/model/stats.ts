import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { AudiobookshelfMeApi } from "../../audiobookshelf.api/service/me";
import type { MeListeningStats } from "../../audiobookshelf.api/interfaces/api/me-listening-stats";

export const listeningStats = () => {
    const data = signal<MeListeningStats.Response | null>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async () => {
        loading.value = true;
        error.value = null;
        data.value = null;

        try {
            const meApi = container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
            const stats = await meApi.listeningStats();
            data.value = stats ?? null;
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load stats";
        } finally {
            loading.value = false;
        }
    };

    return { data, loading, error, load };
};

export default {
    listening: listeningStats(),
};
