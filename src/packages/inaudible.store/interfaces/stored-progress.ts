export interface StoredProgress {
    id: string;
    userId: string;
    libraryItemId: string;
    mediaItemId: string;
    mediaItemType: string;
    duration: number;
    progress: number;
    currentTime: number;
    isFinished: boolean;
    lastUpdate: number;
    startedAt: number;
}
