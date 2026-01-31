export type BookItem = {
    id: string;
    ino?: string;
    name: string;
    pictureUrl: string;
    progress?: number;
    currentTime?: number;
};

export type Book = {
    id: string;
    ino: string;
    name: string;
    description: string;
    pictureUrl: string;
    duration: number;
    genres: string[];
    published: string | null;
    progress?: number;
    currentTime?: number;
    resumeTime?: number;
    inLibrary?: boolean;
    isDownloaded?: boolean;
    narrators: string[];
    series?: {
        id: string;
        name: string;
        books?: BookItem[];
    }[];
    authors?: {
        id: string;
        name: string;
        pictureUrl: string;
        books?: BookItem[];
    }[];
};

export type SeriesItem = {
    id: string;
    name: string;
    genres?: string[];
    duration?: number;
    description?: string;
    published?: string;
    narrators?: string[];
    authors?: {
        id: string;
        name: string;
        books: {
            id: string;
            name: string;
            pictureUrl: string;
        }[];
    }[];
    books: {
        total: number;
        list: {
            id: string;
            position: string;
            name: string;
            pictureUrl: string;
            progress?: number;
            currentTime?: number;
        }[];
    };
};

export type AuthorItem = {
    id: string;
    numBooks: number;
    name: string;
    pictureUrl: string;
};
