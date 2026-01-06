import type { LibraryItem } from "../model/library-item";

export namespace LibraryItems {
    export type Request = {
        libraryId: string,
        page: number,
        limit: number, 
        collapseSeries: boolean,
        minified: boolean,
        include: string[],
    }

    export interface Response {
        results: LibraryItem[];
        total: number;
        limit: number;
        page: number;
        offset: number;
    }
}
