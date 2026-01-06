export interface LibraryItemMetadata {
    title: string;
    titleIgnorePrefix: string;
    subtitle: string | null;
    authorName: string;
    authorNameLF: string;
    narratorName: string;
    seriesName: string;
    genres: string[];
    publishedYear: string;
    publishedDate: string | null;
    publisher: string | null;
    description: string;
    isbn: string | null;
    asin: string | null;
    language: string | null;
    explicit: boolean;
    abridged: boolean;
}