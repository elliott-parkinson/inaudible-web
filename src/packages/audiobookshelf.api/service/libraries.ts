import type { AudiobookshelfApi } from ".";
import type { LibraryAuthors } from "../interfaces/api/library-authors";
import type { LibraryItems } from "../interfaces/api/library-items";
import type { LibrarySeries } from "../interfaces/api/library-series";
import type { MediaProgress } from "../interfaces/api/media-progress";


export class Libraries {
    private _api: AudiobookshelfApi;

    constructor(api: AudiobookshelfApi) {
        this._api = api;
    }

    async personalized(libraryId: string): Promise<string> {
        const response = this._api.request<void, any>(`/libraries/${libraryId}/personalized`, "GET", undefined);

        return response;
    }

    async mediaProgress(req: MediaProgress.Request): Promise<MediaProgress.Response> {

        return this._api.request<void, MediaProgress.Response>(`/me/listening-stats`, "GET", undefined);
    }

    async authors(req: LibraryAuthors.Request): Promise<LibraryAuthors.Response> {
        const path = `/libraries/${req.libraryId}/authors`;

        const params = new URLSearchParams({
            sort: "addedAt",
            desc: "1",
            limit: req.limit.toString(),
            page: req.page.toString(),
            minified: req.minified ? "1" : "0",
            include: [].join(","),
        });

        const url = `${path}?${params.toString()}`;

        return this._api.request<void, LibraryAuthors.Response>(url, "GET", undefined);
    }

    async series(req: LibrarySeries.Request): Promise<LibrarySeries.Response> {
        const path = `/libraries/${req.libraryId}/series`;

        const params = new URLSearchParams({
            sort: "addedAt",
            desc: "0",
            filter: "all",
            limit: req.limit.toString(),
            page: req.page.toString(),
            minified: req.minified ? "1" : "0",
            include: [].join(","),
        });

        const url = `${path}?${params.toString()}`;

        return this._api.request<void, LibrarySeries.Response>(url, "GET", undefined);
    }


    async items(req: LibraryItems.Request): Promise<LibraryItems.Response> {
        const path = `/libraries/${req.libraryId}/items`;

        const params = new URLSearchParams({
            sort: "addedAt",
            desc: "1",
            collapseseries: req.collapseSeries ? "1" : "0",
            limit: req.limit.toString(),
            page: req.page.toString(),
            minified: req.minified ? "1" : "0",
            include: [].join(","),
            // filter: "series.bm8tc2VyaWVz",
        });

        const url = `${path}?${params.toString()}`;

        return this._api.request<void, LibraryItems.Response>(url, "GET", undefined);
    }
}
