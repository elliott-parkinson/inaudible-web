import type { LibraryItem } from "./library-item"

export type LibrarySeries = {
    id: string,
    asin: string | null,
    name: string,
    nameIgnorePrefix: string,
    description: string | null,
    libraryId: string,
    addedAt: number,
    updatedAt: number,
    books: LibraryItem[],
}