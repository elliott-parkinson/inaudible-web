import type { AudiobookshelfMeApi } from "../audiobookshelf.api/service/me";
import type { MyLibraryStore } from "../inaudible.store/store/my-library-store";


export class InaudibleMediaProgressService extends EventTarget {
    _container: Map<string, object>;

    constructor(container: Map<string, object>) {
        super();
        this._container = container;
    }

    private async updateMediaProgress(data: { libraryItemId: string; currentTime: number; duration: number; progress?: number }) {
        const meApi = this._container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
        const progressValue = Number.isFinite(data.progress) ? (data.progress as number) : data.duration > 0 ? data.currentTime / data.duration : 0;

        await meApi.updateProgress({
            libraryItemId: data.libraryItemId,
            body: {
                libraryItemId: data.libraryItemId,
                progress: progressValue,
                currentTime: data.currentTime,
                duration: data.duration,
                lastUpdate: Date.now(),
            },
        });

    }

    async updateMediaProgressByLibraryItemId(
        libraryItemId: string,
        currentTime: number,
        duration: number,
        progress?: number,
    ) {
        const progressStore = this._container.get("inaudible.store.progress") as any;
        const libraryStore = this._container.get("inaudible.store.library") as MyLibraryStore | undefined;
        const progressValue = Number.isFinite(progress) ? (progress as number) : duration > 0 ? currentTime / duration : 0;
        const now = Date.now();

        try {
            await this.updateMediaProgress({ libraryItemId, currentTime, duration, progress: progressValue });
        } catch (error) {
            console.warn('Failed to update progress on server; storing locally.', error);
        }

        await progressStore?.put({
            id: libraryItemId,
            libraryItemId,
            currentTime,
            duration,
            progress: progressValue,
            lastUpdate: now,
            updatedAt: now,
            position: currentTime,
        });

        if (libraryStore) {
            const existing = await libraryStore.get(libraryItemId);
            const addedAt = existing?.addedAt ?? now;
            await libraryStore.put({
                id: libraryItemId,
                addedAt,
                updatedAt: now,
            });
        }

        this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: { currentTime, progress: progressValue } }));
    }

    async updateByLibraryItemId(libraryItemId: string) {
        const progressStore = this._container.get("inaudible.store.progress") as any;
        const meApi = this._container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
        const libraryStore = this._container.get("inaudible.store.library") as MyLibraryStore | undefined;

        const result = await progressStore.getByLibraryItemId(libraryItemId);
        this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: result ?? null }));
        if (result) {
            return;
        }

        const progress = await meApi.getMediaProgress({ id: libraryItemId });
        if (progress && progress.progress) {
            const now = Date.now();
            await progressStore.put({
                id: libraryItemId,
                libraryItemId: libraryItemId,
                position: progress.currentTime,
                duration: progress.duration,
                updatedAt: now,
            });
            if (libraryStore) {
                const existing = await libraryStore.get(libraryItemId);
                const addedAt = existing?.addedAt ?? now;
                await libraryStore.put({
                    id: libraryItemId,
                    addedAt,
                    updatedAt: now,
                });
            }

            this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: progress.progress }));
        } else {
            console.log("No progress data returned from API for library item ID:", libraryItemId);
        }
    }
}
