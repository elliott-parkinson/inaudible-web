import { render, h } from 'preact';
import model from '../../../model';
import { useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { SeriesListItem } from '../../series-list/component/series-item';
import { container } from '../../../../../container';
import type { InaudibleService } from '../../../../inaudible.service';

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { books, series, downloads, storage, loading, error, load } = model.library.list;

    useLayoutEffect(() => {
        load();
    }, [route]);

    return {
        route,
        location,
        books,
        series,
        downloads,
        storage,
        loading,
        error,
        load,
    };
};

export default () => {
    const { location, books, series, downloads, storage, loading, load } = controller();
    const inaudible = container.get("inaudible.service") as InaudibleService;

    const formatBytes = (value: number) => {
        if (!Number.isFinite(value)) {
            return "0 B";
        }
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = value;
        let index = 0;
        while (size >= 1024 && index < units.length - 1) {
            size /= 1024;
            index += 1;
        }
        return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
    };

    const deleteDownload = async (id: string) => {
        await inaudible.myLibrary.deleteDownload(id);
        await load();
    };

    return <>
        <adw-clamp>
            <h2>My library</h2>
            {loading.value == true ? (
                <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section>
            ) : (
                <>
                    <section>
                        <h3>Storage</h3>
                        {storage.value ? (
                            <p>
                                Used {formatBytes(storage.value.used)} of {formatBytes(storage.value.quota)}.{" "}
                                {formatBytes(Math.max(storage.value.quota - storage.value.used, 0))} left (
                                {storage.value.quota > 0 ? Math.round((storage.value.used / storage.value.quota) * 100) : 0}%).
                            </p>
                        ) : (
                            <p>Storage estimate unavailable.</p>
                        )}
                    </section>
                    <section>
                        <h3>Downloaded</h3>
                        {downloads.value.length > 0 ? (
                            <ol class="downloads">
                                {downloads.value.map(item => (
                                    <li key={item.id}>
                                        <img
                                            src={item.coverUrl}
                                            alt={item.title}
                                            role="button"
                                            onClick={() => location.route(`/books/${item.id}`)}
                                        />
                                        <div className="download-meta">
                                            <strong role="button" onClick={() => location.route(`/books/${item.id}`)}>
                                                {item.title}
                                            </strong>
                                            <span>{formatBytes(item.size)} · {item.tracks?.length ?? 0} tracks</span>
                                        </div>
                                        <button onClick={() => deleteDownload(item.id)}>Delete</button>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p>No downloaded books yet.</p>
                        )}
                    </section>
                    <h3>Series</h3>
                    {series.value.length > 0 ? (
                        <ol class="series">
                            {series.value.map(item => (
                                <SeriesListItem key={item.id} series={item} onClick={() => location.route(`/series/${item.id}`)} />
                            ))}
                        </ol>
                    ) : (
                        <section style={{ textAlign: 'center' }}>No series in your library yet.</section>
                    )}
                    <h3>Books</h3>
                    {books.value.length > 0 ? (
                        <ol class="books">
                            {books.value.map(book => (
                                <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
                                    <inaudible-audiobook
                                        libraryItemId={book.id}
                                        src={book.pictureUrl}
                                        title={book.name}
                                        progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))}
                                    />
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <section style={{ textAlign: 'center' }}>No books in your library yet.</section>
                    )}
                </>
            )}
        </adw-clamp>
    </>;
};
