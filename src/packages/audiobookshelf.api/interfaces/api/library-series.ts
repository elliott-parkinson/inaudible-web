import type { LibrarySeries } from "../model/library-series";

export namespace LibrarySeries  {
    export type Request = {
        libraryId: string,
        page: number,
        limit: number, 
        minified: boolean,
        include: string[],
    }

    export interface Response {
        results: LibrarySeries[];
        total: number;
        limit: number;
        page: number;
        offset: number;
    }
}
