
export interface Metadata {
    title: string;
    subtitle: string | null;
    authorName: string;
    narratorName: string;
    seriesName: string;
    genres: string[];
    publishedYear: string;
    publishedDate: string | null;
    publisher: string | null;
    description: string;
    language: string | null;
    explicit: boolean;
    abridged: boolean;
}

export type StoredBook = {
    id: string;
    ino: string;
    libraryId: string;
    authors: string[];

    series: {
        id: string,
        position: string,
    }[],

    addedAt: number;
    updatedAt: number;
    isMissing: boolean;
    isInvalid: boolean;
    isComplete: boolean;
    percentComplete: number;

    meta: Metadata;
    tags: string[];
    duration: number;
}
/*
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
*/