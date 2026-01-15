import type { AudiobookshelfApi } from ".";
import type { MeGet } from "../interfaces/api/me-get";
import type { MeGetMediaProgress } from "../interfaces/api/me-getmediaprogress";
import type { MeItemsInProgress } from "../interfaces/api/me-items-in-progress";
import type { MeListeningSessions } from "../interfaces/api/me-listening-sessions";
import type { MeListeningStats } from "../interfaces/api/me-listening-stats";
import type { MeProgressBatchUpdate } from "../interfaces/api/me-progress-batch-update";
import type { MeProgressDelete } from "../interfaces/api/me-progress-delete";
import type { MeProgressUpdate } from "../interfaces/api/me-progress-update";
import type { MeRemoveProgressFromContinueListening } from "../interfaces/api/me-progress-remove-from-continue-listening";
import type { MeSeriesRemoveFromContinueListening } from "../interfaces/api/me-series-remove-from-continue-listening";

export class AudiobookshelfMeApi {
    private _api: AudiobookshelfApi;

    constructor(api: AudiobookshelfApi) {
        this._api = api;
    }

    async get(): Promise<MeGet.Response> {
        return this._api.request<void, MeGet.Response>(`/me`, "GET", undefined);
    }

    async listeningSessions(): Promise<MeListeningSessions.Response> {
        return this._api.request<void, MeListeningSessions.Response>(`/me/listening-sessions`, "GET", undefined);
    }

    async listeningStats(): Promise<MeListeningStats.Response> {
        return this._api.request<void, MeListeningStats.Response>(`/me/listening-stats`, "GET", undefined);
    }

    async removeProgressFromContinueListening(
        req: MeRemoveProgressFromContinueListening.Request,
    ): Promise<MeRemoveProgressFromContinueListening.Response> {
        return this._api.request<void, MeRemoveProgressFromContinueListening.Response>(
            `/me/progress/${req.id}/remove-from-continue-listening`,
            "GET",
            undefined,
        );
    }

    async getMediaProgress(req: MeGetMediaProgress.Request): Promise<MeGetMediaProgress.Response> { 
        return this._api.request<void, MeGetMediaProgress.Response>(`/me/progress/${req.id}`, "GET", undefined);
    }

    async updateProgressBatch(req: MeProgressBatchUpdate.Request): Promise<MeProgressBatchUpdate.Response> {
        return this._api.request<MeProgressBatchUpdate.Body, MeProgressBatchUpdate.Response>(
            `/me/progress/batch/update`,
            "PATCH",
            req.body,
        );
    }

    async updateProgress(req: MeProgressUpdate.Request): Promise<MeProgressUpdate.Response> {
        return this._api.request<MeProgressUpdate.Body, MeProgressUpdate.Response>(
            `/me/progress/${req.libraryItemId}`,
            "PATCH",
            req.body,
        );
    }

    async deleteProgress(req: MeProgressDelete.Request): Promise<MeProgressDelete.Response> {
        return this._api.request<void, MeProgressDelete.Response>(`/me/progress/${req.id}`, "DELETE", undefined);
    }

    async itemsInProgress(): Promise<MeItemsInProgress.Response> {
        return this._api.request<void, MeItemsInProgress.Response>(`/me/items-in-progress`, "GET", undefined);
    }

    async removeSeriesFromContinueListening(
        req: MeSeriesRemoveFromContinueListening.Request,
    ): Promise<MeSeriesRemoveFromContinueListening.Response> {
        return this._api.request<void, MeSeriesRemoveFromContinueListening.Response>(
            `/me/series/${req.id}/remove-from-continue-listening`,
            "GET",
            undefined,
        );
    }

}
