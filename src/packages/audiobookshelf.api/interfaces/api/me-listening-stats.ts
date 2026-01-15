export namespace MeListeningStats {
    export interface ListeningItem {
        id: string;
        timeListening: number;
        mediaMetadata?: Record<string, unknown>;
        [key: string]: unknown;
    }

    export interface RecentSession {
        id: string;
        libraryItemId?: string;
        timeListening?: number;
        currentTime?: number;
        duration?: number;
        date?: string;
        dayOfWeek?: string;
        mediaMetadata?: Record<string, unknown>;
        [key: string]: unknown;
    }

    export interface Response {
        totalTime?: number;
        items?: Record<string, ListeningItem>;
        days?: Record<string, number>;
        dayOfWeek?: Record<string, number>;
        today?: number;
        recentSessions?: RecentSession[];
        [key: string]: unknown;
    }
}
