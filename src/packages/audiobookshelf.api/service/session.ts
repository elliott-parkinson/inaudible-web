import type { AudiobookshelfApi } from ".";
import type { SessionSync } from "../interfaces/api/session-sync";

export class AudiobookshelfSessionApi {
    private _api: AudiobookshelfApi;

    constructor(api: AudiobookshelfApi) {
        this._api = api;
    }

    async sync(req: SessionSync.Request): Promise<SessionSync.Response> { 
        return this._api.request<void, SessionSync.Response>(`/session/${req.id}/sync`, "POST", undefined);
    }
}