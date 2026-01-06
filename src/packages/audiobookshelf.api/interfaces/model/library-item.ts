import type { LibraryItemMedia } from "./library-item-media";

export interface LibraryItem {
    id: string;
    ino: string;
    libraryId: string;
    folderId: string;
    path: string;
    relPath: string;
    isFile: boolean;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    addedAt: number;
    updatedAt: number;
    isMissing: boolean;
    isInvalid: boolean;
    mediaType: string;
    media: LibraryItemMedia;
    numFiles: number;
    size: number;
}