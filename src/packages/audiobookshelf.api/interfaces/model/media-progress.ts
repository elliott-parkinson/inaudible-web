export interface MediaProgress {
    id: string;
    userId: string;
    libraryItemId: string;
    episodeId: string | null;
    mediaItemId: string;
    mediaItemType: string;
    duration: number;
    progress: number;
    currentTime: number;
    isFinished: boolean;
    hideFromContinueListening: boolean;
    ebookLocation: string | null;
    ebookProgress: number;
    lastUpdate: number;
    startedAt: number;
    finishedAt: number | null;
}