import { render, h } from 'preact';
import model from '../../../model';
import { useLayoutEffect, useState } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { signal } from '@preact/signals';
import { MoreByAuthor } from '../../authors/component/more-by-author';
import { container } from '../../../../../container';
import type { InaudibleService } from '../../../../inaudible.service';
import downloadIcon from "../../../icons/folder-download-symbolic.svg";


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
    const inaudible = container.get("inaudible.service") as InaudibleService;

    const handleOpenPlayer = () => {
        if (!data.value?.id) {
            return;
        }
        model.player.openPlayer({
            libraryItemId: data.value.id,
            title: data.value.name ?? "",
            author: data.value?.authors?.map((author) => author.name).join(", ") ?? "",
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
            const result = await inaudible.myLibrary.addToLibrary(data.value.id, duration);
            data.value = {
                ...data.value,
                inLibrary: true,
                progress: result.progress,
                currentTime: result.currentTime,
            };
        } finally {
            setLibraryUpdating(false);
        }
    };

    const downloadBook = async () => {
        if (!data.value?.id || downloadUpdating) {
            return;
        }
        setDownloadUpdating(true);
        try {
            const didDownload = await inaudible.myLibrary.downloadBook({
                id: data.value.id,
                title: data.value.name ?? "Untitled",
                coverUrl: data.value.pictureUrl ?? "",
            });
            if (didDownload) {
                data.value = {
                    ...data.value,
                    isDownloaded: true,
                };
            }
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
            await inaudible.myLibrary.deleteDownload(data.value.id);
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
                            {downloadUpdating ? 'Downloading...' : 
                                <adw-icon style="width: 1.4em; height: 1.4em;">
                                    <img src={downloadIcon} alt="Download" />
                                </adw-icon>
                            }
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
