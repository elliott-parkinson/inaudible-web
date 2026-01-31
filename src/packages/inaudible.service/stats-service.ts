import type { AudiobookshelfMeApi } from "../audiobookshelf.api/service/me";
import type { MeListeningStats } from "../audiobookshelf.api/interfaces/api/me-listening-stats";
import type { StatsStore } from "../inaudible.store/store/stats-store";

export class StatsService {
    private container: Map<string, object>;

    constructor(container: Map<string, object>) {
        this.container = container;
    }

    async getListeningStatsCached(): Promise<MeListeningStats.Response | null> {
        const statsStore = this.container.get("inaudible.store.stats") as StatsStore;
        const cached = await statsStore.get("listening");
        return cached?.data ?? null;
    }

    async refreshListeningStats(): Promise<MeListeningStats.Response | null> {
        const meApi = this.container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
        const statsStore = this.container.get("inaudible.store.stats") as StatsStore;
        const stats = await meApi.listeningStats();
        if (stats) {
            await statsStore.put({
                id: "listening",
                data: stats,
                updatedAt: Date.now(),
            });
        }
        return stats ?? null;
    }
}
