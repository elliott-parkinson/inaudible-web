import type { AudiobookshelfMeApi } from "../audiobookshelf.api/service/me";
import type { StoredProgress } from "../inaudible.model/interfaces/stored-progress";


export class InaudibleMediaProgressService extends EventTarget {
    _container: Map<string, object>;

    constructor(container: Map<string, object>) {
        super();
        this._container = container;
    }

    private updateMediaProgress(data: StoredProgress) {

    }

    async updateByLibraryItemId(libraryItemId: string) {
        const progressStore = this._container.get("inaudible.store.progress") as any;
        const meApi = this._container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;

        const result = await progressStore.getByLibraryItemId(libraryItemId);
        this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: result ?? null }));


        const progress = await meApi.getMediaProgress({ id: libraryItemId });
        if (progress && progress.progress) {
            await progressStore.put({
                libraryItemId: libraryItemId,
                position: progress.progress,
                duration: progress.duration,
                updatedAt: Date.now(),
            });

            this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: progress.progress }));
        } else {
            console.log("No progress data returned from API for library item ID:", libraryItemId);
        }
    }
}