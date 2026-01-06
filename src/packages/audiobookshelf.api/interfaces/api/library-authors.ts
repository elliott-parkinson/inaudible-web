import type { LibraryAuthor } from "../model/library-author";
import type { LibraryItem } from "../model/library-item";

export namespace LibraryAuthors {
    export type Request = {
        libraryId: string,
        page: number,
        limit: number, 
        minified: boolean,
        include: string[],
    }

    export interface Response {
        authors: LibraryAuthor[];
    }
}
