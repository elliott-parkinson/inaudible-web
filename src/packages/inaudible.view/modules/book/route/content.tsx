import { render, h } from 'preact';
import model from '../../../model';
import { useLayoutEffect, useState } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { signal } from '@preact/signals';
import { MoreByAuthor } from '../../authors/component/more-by-author';
import { container } from '../../../../../container';
import type { AudiobookshelfApi } from '../../../../audiobookshelf.api/service';
import type { InaudibleService } from '../../../../inaudible.service';
import type { DownloadsStore } from '../../../../inaudible.model/store/downloads-store';


const viewModel = {
    searchTerm:  signal<string>(""),
}

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { data, loading, error, load } = model.books.one;

    useLayoutEffect(() => {
        load({ page: 0, limit: 82, id: route.params.id });
    }, [route]);

    return {
        route,
        location,
        data, error, loading, load,
    }
}

export default () => {
    const {
        route,
        location,
        data, error, loading, load,
    } = controller();

    const [libraryUpdating, setLibraryUpdating] = useState(false);
    const [downloadUpdating, setDownloadUpdating] = useState(false);
    const api = container.get("audiobookshelf.api") as AudiobookshelfApi;
    const inaudible = container.get("inaudible.service") as InaudibleService;
    const downloadsStore = container.get("inaudible.store.downloads") as DownloadsStore;
    const accessToken = api.getAccessToken();
    const baseUrl = api.getBaseUrl();

    const handleOpenPlayer = () => {
        if (!data.value?.id) {
            return;
        }
        model.player.openPlayer({
            libraryItemId: data.value.id,
            title: data.value.name ?? "",
            coverUrl: data.value.pictureUrl ?? "",
            startPosition: data.value.resumeTime ?? data.value.currentTime ?? 0,
        });
    };

    const addToLibrary = async () => {
        if (!data.value?.id || !inaudible?.progress || libraryUpdating || data.value?.inLibrary) {
            return;
        }
        setLibraryUpdating(true);
        try {
            const duration = data.value.duration ?? 0;
            const seedPosition = Math.min(10, duration || 10);
            const seedProgress = duration > 0 ? seedPosition / duration : 0;
            await inaudible.progress.updateMediaProgressByLibraryItemId(
                data.value.id,
                seedPosition,
                duration,
                seedProgress
            );
            data.value = {
                ...data.value,
                inLibrary: true,
                progress: seedProgress,
                currentTime: seedPosition,
            };
        } finally {
            setLibraryUpdating(false);
        }
    };

    const normalizeApiBase = (url: string) => {
        const trimmed = url.replace(/\/+$/, '');
        if (trimmed.endsWith('/audiobookshelf/api')) {
            return trimmed;
        }
        if (trimmed.endsWith('/audiobookshelf')) {
            return `${trimmed}/api`;
        }
        return `${trimmed}/audiobookshelf/api`;
    };

    const resolveContentUrl = (apiBase: string, contentUrl: string, token: string) => {
        const origin = apiBase.replace(/\/api$/, '');
        const url = contentUrl.startsWith('http') ? contentUrl : `${origin}${contentUrl}`;
        if (url.includes('token=')) {
            return url;
        }
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${encodeURIComponent(token)}`;
    };

    const downloadBook = async () => {
        if (!data.value?.id || !accessToken || !baseUrl || downloadUpdating) {
            return;
        }
        setDownloadUpdating(true);
        try {
            const apiBase = normalizeApiBase(baseUrl);
            const streamUrl = `${apiBase}/items/${data.value.id}/play?token=${encodeURIComponent(accessToken)}`;
            const response = await fetch(streamUrl, { method: 'POST' });
            if (!response.ok) {
                return;
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
                return;
            }
            const tracks: { index: number; title: string; size: number; blob: Blob }[] = [];
            let totalSize = 0;
            for (const track of downloadableTracks) {
                const contentUrl = track?.contentUrl;
                if (!contentUrl) {
                    continue;
                }
                const downloadUrl = resolveContentUrl(apiBase, contentUrl, accessToken);
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
                return;
            }
            const now = Date.now();
            await downloadsStore.put({
                id: data.value.id,
                title: data.value.name ?? 'Untitled',
                coverUrl: data.value.pictureUrl ?? '',
                size: totalSize,
                tracks,
                createdAt: now,
                updatedAt: now,
            });
            data.value = {
                ...data.value,
                isDownloaded: true,
            };
        } finally {
            setDownloadUpdating(false);
        }
    };

    const deleteDownload = async () => {
        if (!data.value?.id || downloadUpdating) {
            return;
        }
        setDownloadUpdating(true);
        try {
            await downloadsStore.delete(data.value.id);
            data.value = {
                ...data.value,
                isDownloaded: false,
            };
        } finally {
            setDownloadUpdating(false);
        }
    };

    return <>
        <adw-clamp>
            <picture className="book-picture">
                <img src={data.value?.pictureUrl} alt="Background" />
                <img src={data.value?.pictureUrl} alt={data.value?.name} />
            </picture>

            <section className="book-details">
                <h2>{data.value?.name}</h2>
                <h3>by {data.value?.authors.map(author => author.name).join(", ")}</h3>
                <time is="duration-display" data-seconds={data.value?.duration.toString()} ></time>
                { data.value?.narrators.length && <span><strong>Narrated by:</strong> {data.value?.narrators.join(", ")}</span> }
                { data.value?.published && <span><strong>Released:</strong> {data.value?.published}</span> }
                { data.value?.genres.length && <span><strong>Genres:</strong> {data.value?.genres.join(", ")}</span> }
                { data.value?.description && <p dangerouslySetInnerHTML={{ __html: data.value?.description }} ></p> }
                <div className="book-actions">
                    <button className="primary" onClick={handleOpenPlayer}>Play</button>
                    {data.value?.inLibrary ? (
                        <sup className="badge success">My library</sup>
                    ) : (
                        <button onClick={addToLibrary} disabled={libraryUpdating}>
                            {libraryUpdating ? 'Adding...' : 'Add to my library'}
                        </button>
                    )}
                    {data.value?.isDownloaded ? (
                        <button onClick={deleteDownload} disabled={downloadUpdating}>
                            {downloadUpdating ? 'Removing...' : 'Delete local item'}
                        </button>
                    ) : (
                        <button onClick={downloadBook} disabled={downloadUpdating}>
                            {downloadUpdating ? 'Downloading...' : 'Download'}
                        </button>
                    )}
                </div>
            </section>
            { /* Should ideally be a carousel */ }
            { data.value?.series?.map(series => series.books.length > 1 && <div key={series.id}>
                <h4>More in <a href={`/series/${series.id}`}>{series.name}</a></h4>
                <ol class="books">
                    {series.books.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
						<inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
					</li>)}
                </ol>
            </div>)}

            { data.value?.authors && <MoreByAuthor authors={data.value?.authors} /> }

            <section>
            </section>

        </adw-clamp>
    </>;
}
