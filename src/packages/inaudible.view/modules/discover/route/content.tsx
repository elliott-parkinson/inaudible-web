import { render, h } from 'preact';
import model from '../../../model';
import { useLocation, useRoute } from 'preact-iso';
import { Signal, signal } from '@preact/signals';
import { useLayoutEffect } from 'preact/hooks';

const viewModel = {
    searchTerm:  signal<string>(""),
}


const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { discover, latest, loading, error, load } = model.discover.discover;

    useLayoutEffect(() => {
        load({ page: 0, limit: 10 });
    }, [route]);

    return {
        route,
        location,
        discover, latest, error, loading, load,
    }
}

export default () => {
    const {
        route,
        location,
        discover, latest, error, loading,
    } = controller();

    return <>
        <adw-clamp>
	        <h2>Discover</h2>
	        { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">
	            {discover.value.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
							<inaudible-audiobook src={book.pictureUrl} title={book.name} />
						</li>)}
	        </ol> }
            <h2>What's New</h2>
            { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">
                {latest.value.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
						<inaudible-audiobook src={book.pictureUrl} title={book.name} />
					</li>)}
            </ol> }
        </adw-clamp>
    </>;
}
