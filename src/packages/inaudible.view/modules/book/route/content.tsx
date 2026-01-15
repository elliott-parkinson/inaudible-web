import { render, h } from 'preact';
import model from '../../../model';
import { useLayoutEffect, useState } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { signal } from '@preact/signals';
import { MoreByAuthor } from '../../authors/component/more-by-author';
import { container } from '../../../../../container';
import type { AudiobookshelfApi } from '../../../../audiobookshelf.api/service';


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

    const [playerOpen, setPlayerOpen] = useState(false);
    const api = container.get("audiobookshelf.api") as AudiobookshelfApi;
    const accessToken = api.getAccessToken();
    const baseUrl = api.getBaseUrl();

    const openPlayer = () => {
        if (!data.value?.id) {
            return;
        }
        setPlayerOpen(true);
    };

    const closePlayer = () => {
        setPlayerOpen(false);
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
                    <button className="primary" onClick={openPlayer}>Play</button>
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
        <div
            className={`adw-bottom-sheet-backdrop${playerOpen ? " open" : ""}`}
            onClick={closePlayer}
        ></div>
        <adw-bottom-sheet open={playerOpen ? true : undefined}>
            <div className="adw-player">
                <div className="adw-player-header">
                    <strong>{data.value?.name}</strong>
                    <button onClick={closePlayer}>Close</button>
                </div>
                {playerOpen && data.value?.id && (
                    <audiobookshelf-player
                        media-item-id={data.value.id}
                        api-key={accessToken ?? ""}
                        base-url={baseUrl ?? ""}
                        start-position={data.value?.resumeTime ?? data.value?.currentTime ?? 0}
                    />
                )}
            </div>
        </adw-bottom-sheet>
    </>;
}
