import { render, h } from 'preact';
import model from '../../../model';
import { useLocation, useRoute } from 'preact-iso';
import { Signal, signal } from '@preact/signals';
import { useLayoutEffect, useRef } from 'preact/hooks';

const viewModel = {
    searchTerm:  signal<string>(""),
}


const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { discover, latest, continueListening, categories, loading, error, load } = model.discover.discover;

    useLayoutEffect(() => {
        load({ page: 0, limit: 10 });
    }, [route]);

    return {
        route,
        location,
        discover, continueListening, categories, latest, error, loading, load,
    }
}

const CategoryRow = ({ category, onSelect }: { category: { name: string; books: any[] }; onSelect: (id: string) => void }) => {
    const listRef = useRef<HTMLOListElement>(null);

    const scrollBy = (offset: number) => {
        listRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
    };

    return (
        <div className="category-row">
            <div className="category-row-header">
                <h2>{category.name}</h2>
                <div className="category-row-actions">
                    <button type="button" onClick={() => scrollBy(-320)} aria-label={`Scroll ${category.name} left`}>
                        &lt;
                    </button>
                    <button type="button" onClick={() => scrollBy(320)} aria-label={`Scroll ${category.name} right`}>
                        &gt;
                    </button>
                </div>
            </div>
            <ol class="category-row-list" ref={listRef}>
                {category.books.map(book => (
                    <li key={book.id} onClick={() => onSelect(book.id)}>
                        <inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default () => {
    const {
        route,
        location,
        discover, latest, continueListening, categories, error, loading,
    } = controller();

    const continueListeningSafe = continueListening ?? signal([]);
    const categoriesSafe = categories ?? signal([]);

    return <>
        <style>
            {`
            .category-row-list {
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: 140px;
                gap: 1em;
                padding: 0;
                margin: 0;
                list-style: none;
            }
            .category-row-list li {
                width: 140px;
                aspect-ratio: 1 / 1;
            }
            .category-row-list inaudible-audiobook {
                display: block;
                width: 100%;
                height: 100%;
                border-radius: 0.8em;
                overflow: hidden;
            }
            `}
        </style>
        <adw-clamp>
            {continueListeningSafe.value.length > 0 && (
                <>
                    <h2>Continue Listening</h2>
                    { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">
                        {continueListeningSafe.value.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
							<inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
						</li>)}
                    </ol> }
                </>
            )}
            <h2>What's New</h2>
            { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">
                {latest.value.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
						<inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
					</li>)}
            </ol> }
            <h2>Discover</h2>
	        { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">
	            {discover.value.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
                    <inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
                </li>)}
	        </ol> }
            {categoriesSafe.value.length > 0 && (
                <>
                    {categoriesSafe.value.map(category => (
                        <CategoryRow
                            key={category.name}
                            category={category}
                            onSelect={(id) => location.route(`/books/${id}`)}
                        />
                    ))}
                </>
            )}
	        
        </adw-clamp>
    </>;
}
