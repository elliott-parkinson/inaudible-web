import type { LibraryItem } from "../model/library-item";
import type { MediaProgress } from "../model/media-progress";

export namespace MeItemsInProgress {
    export interface Item {
        libraryItem?: LibraryItem;
        mediaProgress?: MediaProgress;
        [key: string]: unknown;
    }

    export interface Response {
        items: Item[];
        total?: number;
        limit?: number;
        page?: number;
        offset?: number;
        [key: string]: unknown;
    }
}
