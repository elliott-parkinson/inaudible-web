import { render, h } from 'preact';
import model from '../../../model';
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { signal } from '@preact/signals';
import profile from "../../../icons/user.svg";
import { SeriesListItem } from '../../series-list/component/series-item';

const viewModel = {
    searchTerm: signal<string>(""),
    activeTab: signal<'books' | 'series' | 'authors'>('books'),
};

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const books = model.books.list;
    const series = model.series.list;
    const authors = model.authors.list;

    useEffect(() => {
        const unsub = viewModel.searchTerm.subscribe(value => {
            if (value.length >= 3) {
                books.load({ page: 0, limit: 82, searchTerm: value });
                series.load({ page: 0, limit: 82, searchTerm: value });
                authors.load({ page: 0, limit: 82, searchTerm: value });
            } else if (value === "") {
                books.load({ page: 0, limit: 82 });
                series.load({ page: 0, limit: 82 });
                authors.load({ page: 0, limit: 82 });
            }
        });
        return () => unsub();
    }, []);

    useLayoutEffect(() => {
        books.load({ page: 0, limit: 82 });
        series.load({ page: 0, limit: 82 });
        authors.load({ page: 0, limit: 82 });
    }, [route]);

    return {
        route,
        location,
        books,
        series,
        authors,
        activeTab: viewModel.activeTab,
        searchTerm: viewModel.searchTerm,
    };
};

export default () => {
    const {
        location,
        books,
        series,
        authors,
        activeTab,
        searchTerm,
    } = controller();

    return (
        <adw-clamp>
            <section>
                <form className="stack">
                    <input
                        type="search"
                        placeholder="Search Library"
                        required
                        onInput={(event) => searchTerm.value = (event.target as HTMLInputElement).value}
                        defaultValue={searchTerm.value}
                    />
                </form>
            </section>
            <div className="tab-list">
                <button
                    type="button"
                    className={activeTab.value === 'books' ? 'active' : ''}
                    onClick={() => activeTab.value = 'books'}
                >
                    Books {searchTerm.value.length >= 3 ? `(${books.data.value.length})` : ""}
                </button>
                <button
                    type="button"
                    className={activeTab.value === 'series' ? 'active' : ''}
                    onClick={() => activeTab.value = 'series'}
                >
                    Series {searchTerm.value.length >= 3 ? `(${series.data.value.length})` : ""}
                </button>
                <button
                    type="button"
                    className={activeTab.value === 'authors' ? 'active' : ''}
                    onClick={() => activeTab.value = 'authors'}
                >
                    Authors {searchTerm.value.length >= 3 ? `(${authors.data.value.length})` : ""}
                </button>
            </div>

            <section role="tabpanel" hidden={activeTab.value !== 'books'}>
                {books.loading.value ? (
                    <section style={{ textAlign: 'center' }}>Loading...</section>
                ) : (
                    <ol class="books">
                        {books.data.value.map(book => (
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
                )}
            </section>

            <section role="tabpanel" hidden={activeTab.value !== 'series'}>
                {series.loading.value ? (
                    <section style={{ textAlign: 'center' }}>Loading...</section>
                ) : (
                    <ol class="series">
                        {series.data.value.map(item => (
                            <SeriesListItem key={item.id} series={item} onClick={() => location.route(`/series/${item.id}`)} />
                        ))}
                    </ol>
                )}
            </section>

            <section role="tabpanel" hidden={activeTab.value !== 'authors'}>
                {authors.loading.value ? (
                    <section style={{ textAlign: 'center' }}>Loading...</section>
                ) : (
                    <ol class="authors">
                        {authors.data.value.map(author => (
                            <li key={author.id} onClick={() => location.route(`/authors/${author.id}`)}>
                                <figure class="author">
                                    <picture>
                                        <img src={author.pictureUrl} onError={(event) => (event.target as HTMLImageElement).src = profile} />
                                    </picture>
                                    <figcaption>{author.name}</figcaption>
                                    <span>{author.numBooks} books</span>
                                </figure>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </adw-clamp>
    );
};
