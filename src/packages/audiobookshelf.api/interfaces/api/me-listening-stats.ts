export namespace MeListeningStats {
    export interface Response {
        totalListeningTime?: number;
        totalDuration?: number;
        totalSessions?: number;
        totalItemsInProgress?: number;
        totalFinished?: number;
        totalStarted?: number;
        [key: string]: unknown;
    }
}
