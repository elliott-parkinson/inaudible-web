export namespace MeGetMediaProgress {
    export interface Request {
		id: string;
    }

    export interface Response {
        id: string;
        libraryItemId: string;
        episodeId: string;
        duration: number;
        progress: number;
        currentTime: number;
        isFinished: boolean;
        hideFromContinueListening: boolean;
        lastUpdate: number;
        startedAt: number;
        finishedAt: number;
    }
}