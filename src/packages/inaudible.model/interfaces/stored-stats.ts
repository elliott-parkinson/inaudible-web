import type { MeListeningStats } from "../../audiobookshelf.api/interfaces/api/me-listening-stats";

export type StoredStats = {
    id: string;
    data: MeListeningStats.Response;
    updatedAt: number;
};
