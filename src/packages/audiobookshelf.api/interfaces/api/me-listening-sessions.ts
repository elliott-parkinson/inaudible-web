export namespace MeListeningSessions {
    export interface Session {
        id?: string;
        userId?: string;
        libraryItemId?: string;
        mediaItemId?: string;
        mediaType?: string;
        currentTime?: number;
        duration?: number;
        startedAt?: number;
        updatedAt?: number;
        [key: string]: unknown;
    }

    export interface Response {
        sessions: Session[];
        total?: number;
        [key: string]: unknown;
    }
}
