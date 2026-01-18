import { render, h } from 'preact';
import model from '../../../model';
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { Signal, signal } from '@preact/signals';

const viewModel = {
    searchTerm:  signal<string>(""),
}

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { data, loading, error, load } = model.books.list;

    useEffect(() => {
        const unsub = viewModel.searchTerm.subscribe(value => {
            if (value.length >= 3) {
                load({ page: 0, limit: 82, searchTerm: viewModel.searchTerm.value });
            }
            else if (value == "") {
                load({ page: 0, limit: 82 });
            }
        });
        return () => unsub();
    }, []);

    useLayoutEffect(() => {
        load({ page: 0, limit: 82 });
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

    return <>
        <adw-clamp>
            <section >
                <form className="stack">
                    <input type="search" placeholder="Search Library" required onInput={(e) => viewModel.searchTerm.value = (e.target as any).value} defaultValue={viewModel.searchTerm.value}/>
                </form>
            </section>
            { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">

                {data.value.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
                    <inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
                </li>)}
            </ol> }
        </adw-clamp>
    </>;
}
