export type StoredSeries = {
    id: string,
    name: string,
    description: string | null,
    addedAt: number,
    updatedAt: number,
    books: {
        id: string,
        name: string,
        pictureUrl: string,
        position: string,
    }[],
}