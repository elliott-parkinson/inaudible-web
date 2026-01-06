export type LibraryAuthor = {
    id: string,
    asin: string | null,
    name: string,
    description: string | null,
    imagePath: string | null,
    libraryId: string,
    addedAt: number,
    updatedAt: number,
    numBooks: number,
    lastFirst: string
}