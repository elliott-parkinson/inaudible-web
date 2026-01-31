import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { MeListeningStats } from "../../audiobookshelf.api/interfaces/api/me-listening-stats";
import type { InaudibleService } from "../../inaudible.service";

export const listeningStats = () => {
    const data = signal<MeListeningStats.Response | null>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async () => {
        loading.value = true;
        error.value = null;
        data.value = null;

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            const cached = await inaudible.stats.getListeningStatsCached();
            if (cached) {
                data.value = cached;
                loading.value = false;
            }
            const refresh = async () => {
                try {
                    const stats = await inaudible.stats.refreshListeningStats();
                    if (stats) {
                        data.value = stats;
                    }
                } catch (err) {
                    if (!data.value) {
                        error.value = err instanceof Error ? err.message : "Failed to load stats";
                    }
                } finally {
                    if (loading.value) {
                        loading.value = false;
                    }
                }
            };
            void refresh();
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load stats";
        } finally {
            if (loading.value) {
                loading.value = false;
            }
        }
    };

    return { data, loading, error, load };
};

export default {
    listening: listeningStats(),
};
