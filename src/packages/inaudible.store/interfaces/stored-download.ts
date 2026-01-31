export type StoredDownload = {
    id: string;
    title: string;
    coverUrl: string;
    size: number;
    tracks: {
        index: number;
        title: string;
        size: number;
        blob: Blob;
    }[];
    createdAt: number;
    updatedAt: number;
};
