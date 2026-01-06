import type { LibraryItemMetadata } from "./library-item-metadata";

export interface LibraryItemMedia {
    id: string;
    metadata: LibraryItemMetadata;
    coverPath: string;
    tags: string[];
    numTracks: number;
    numAudioFiles: number;
    numChapters: number;
    duration: number;
    size: number;
}