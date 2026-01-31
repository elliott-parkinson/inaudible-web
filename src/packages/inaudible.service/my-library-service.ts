import type { AudiobookshelfApi } from "../audiobookshelf.api/service";
import type { MediaProgress } from "../audiobookshelf.api/interfaces/model/media-progress";
import type { DownloadsStore } from "../inaudible.store/store/downloads-store";
import type { MyLibraryStore } from "../inaudible.store/store/my-library-store";
import type { ProgressStore } from "../inaudible.store/store/progress-store";
import type { SeriesStore } from "../inaudible.store/store/series-store";
import type { BookStore } from "../inaudible.store/store/books-store";
import type { BookItem, SeriesItem } from "./types/library";
import { buildApiUrl } from "./helper/api-url";
import type { InaudibleMediaProgressService } from "./media-progress";

export class MyLibraryService {
    private container: Map<string, object>;
    private progressService: InaudibleMediaProgressService;

    constructor(container: Map<string, object>, progressService: InaudibleMediaProgressService) {
        this.container = container;
        this.progressService = progressService;
    }

    private getApi() {
        return this.container.get("audiobookshelf.api") as AudiobookshelfApi;
    }

    async storeProgress(items: MediaProgress[] | undefined) {
        if (!items?.length) {
            return;
        }
        const progressStore = this.container.get("inaudible.store.progress") as ProgressStore;
        const libraryStore = this.container.get("inaudible.store.library") as MyLibraryStore;
        const now = Date.now();

        await progressStore.putMany(items.map(item => ({
            id: item.id,
            userId: item.userId,
            libraryItemId: item.libraryItemId,
            mediaItemId: item.mediaItemId,
            mediaItemType: item.mediaItemType,
            duration: item.duration,
            progress: item.progress,
            currentTime: item.currentTime,
            isFinished: item.isFinished,
            lastUpdate: item.lastUpdate,
            startedAt: item.startedAt,
        })));

        await libraryStore.putMany(items.map(item => ({
            id: item.libraryItemId,
            addedAt: now,
            updatedAt: now,
        })));
    }

    async addToLibrary(libraryItemId: string, duration: number) {
        const seedPosition = Math.min(10, duration || 10);
        const seedProgress = duration > 0 ? seedPosition / duration : 0;
        await this.progressService.updateMediaProgressByLibraryItemId(
            libraryItemId,
            seedPosition,
            duration,
            seedProgress
        );
        return { progress: seedProgress, currentTime: seedPosition };
    }

    private normalizeApiBase(url: string) {
        const trimmed = url.replace(/\/+$/, '');
        if (trimmed.endsWith('/audiobookshelf/api')) {
            return trimmed;
        }
        if (trimmed.endsWith('/audiobookshelf')) {
            return `${trimmed}/api`;
        }
        return `${trimmed}/audiobookshelf/api`;
    }

    private resolveContentUrl(apiBase: string, contentUrl: string, token: string) {
        const origin = apiBase.replace(/\/api$/, '');
        const url = contentUrl.startsWith('http') ? contentUrl : `${origin}${contentUrl}`;
        if (url.includes('token=')) {
            return url;
        }
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${encodeURIComponent(token)}`;
    }

    async downloadBook(item: { id: string; title: string; coverUrl: string }): Promise<boolean> {
        const api = this.getApi();
        const accessToken = api.getAccessToken();
        const baseUrl = api.getBaseUrl();
        if (!accessToken || !baseUrl) {
            return false;
        }

        const downloadsStore = this.container.get("inaudible.store.downloads") as DownloadsStore;
        const apiBase = this.normalizeApiBase(baseUrl);
        const streamUrl = `${apiBase}/items/${item.id}/play?token=${encodeURIComponent(accessToken)}`;
        const response = await fetch(streamUrl, { method: 'POST' });
        if (!response.ok) {
            return false;
        }
        const payload = await response.json();
        const trackCandidates =
            payload?.libraryItem?.media?.tracks ||
            payload?.media?.tracks ||
            payload?.audioTracks ||
            payload?.mediaMetadata?.audioTracks ||
            [];
        const trackList = Array.isArray(trackCandidates) ? trackCandidates : [];
        const downloadableTracks = trackList.filter((track) => track?.contentUrl && !track.contentUrl.includes('/hls/'));
        if (!downloadableTracks.length) {
            return false;
        }

        const tracks: { index: number; title: string; size: number; blob: Blob }[] = [];
        let totalSize = 0;
        for (const track of downloadableTracks) {
            const contentUrl = track?.contentUrl;
            if (!contentUrl) {
                continue;
            }
            const downloadUrl = this.resolveContentUrl(apiBase, contentUrl, accessToken);
            const mediaResponse = await fetch(downloadUrl);
            if (!mediaResponse.ok) {
                continue;
            }
            const blob = await mediaResponse.blob();
            const title = track?.title || track?.name || track?.metadata?.title || `Track ${tracks.length + 1}`;
            const index = typeof track?.index === 'number' ? track.index : tracks.length + 1;
            tracks.push({
                index,
                title,
                size: blob.size,
                blob,
            });
            totalSize += blob.size;
        }

        if (!tracks.length) {
            return false;
        }

        const now = Date.now();
        await downloadsStore.put({
            id: item.id,
            title: item.title ?? 'Untitled',
            coverUrl: item.coverUrl ?? '',
            size: totalSize,
            tracks,
            createdAt: now,
            updatedAt: now,
        });
        return true;
    }

    async deleteDownload(id: string) {
        const downloadsStore = this.container.get("inaudible.store.downloads") as DownloadsStore;
        await downloadsStore.delete(id);
    }

    async listLibrary() {
        const api = this.getApi();
        const bookStore = this.container.get("inaudible.store.books") as BookStore;
        const progressStore = this.container.get("inaudible.store.progress") as ProgressStore;
        const libraryStore = this.container.get("inaudible.store.library") as MyLibraryStore;
        const downloadsStore = this.container.get("inaudible.store.downloads") as DownloadsStore;
        const seriesStore = this.container.get("inaudible.store.series") as SeriesStore;

        const libraryItems = await libraryStore.getAll();
        const progressItems = await progressStore.getAll();
        const progressMap = new Map(progressItems.map(item => [item.libraryItemId, item]));
        const allBooks = await bookStore.getAll();
        const booksById = new Map(allBooks.map(book => [book.id, book]));

        const sortedLibrary = [...libraryItems].sort((a, b) => {
            const aTime = a.updatedAt ?? a.addedAt ?? 0;
            const bTime = b.updatedAt ?? b.addedAt ?? 0;
            return bTime - aTime;
        });

        const seriesIds = new Set<string>();
        sortedLibrary.forEach(item => {
            const stored = booksById.get(item.id);
            stored?.series?.forEach(seriesItem => seriesIds.add(seriesItem.id));
        });

        const books = sortedLibrary
            .map(item => {
                const book = booksById.get(item.id);
                if (!book || (book.series && book.series.length > 0)) {
                    return null;
                }
                const progressItem = progressMap.get(book.id);
                return {
                    id: book.id,
                    ino: book.ino,
                    name: book.meta.title,
                    pictureUrl: buildApiUrl(api, `items/${book.id}/cover`),
                    progress: progressItem?.progress ?? 0,
                    currentTime: progressItem?.currentTime ?? 0,
                } as BookItem;
            })
            .filter(Boolean) as BookItem[];

        const seriesItems = await Promise.all(
            Array.from(seriesIds).map(async (seriesId) => {
                const seriesEntry = await seriesStore.get(seriesId);
                if (!seriesEntry) {
                    return null;
                }
                return {
                    id: seriesEntry.id,
                    name: seriesEntry.name,
                    books: {
                        total: seriesEntry.books.length,
                        list: seriesEntry.books.map(book => ({
                            id: book.id,
                            position: book.position,
                            name: book.name,
                            pictureUrl: book.pictureUrl,
                            progress: progressMap.get(book.id)?.progress ?? 0,
                            currentTime: progressMap.get(book.id)?.currentTime ?? 0,
                        })),
                    },
                } as SeriesItem;
            })
        );

        const downloads = await downloadsStore.getAll();

        let storage: { used: number; quota: number } | null = null;
        if (navigator.storage?.estimate) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate?.usage;
            const quota = estimate?.quota;
            if (typeof usage === 'number' && typeof quota === 'number') {
                storage = {
                    used: usage,
                    quota,
                };
            }
        }

        return { books, series: seriesItems.filter(Boolean) as SeriesItem[], downloads, storage };
    }
}
