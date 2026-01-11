import { render, h } from 'preact';
import model from '../../../model';
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { MoreByAuthor } from '../../authors/component/more-by-author';


const viewModel = {

}

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { data, loading, error, load } = model.series.one;

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

    return <>
        <adw-clamp>
            <section className="book-details">
                <h2>{data.value?.name}</h2>
                <h3>{data.value?.books.total} books.</h3>

                <time is="duration-display" data-seconds={data.value?.duration.toString()} ></time>
                { data.value?.narrators.length && <span><strong>Narrated by:</strong> {data.value?.narrators.join(", ")}</span> }
                { data.value?.published && <span><strong>Released:</strong> {data.value?.published}</span> }
                { data.value?.genres.length && <span><strong>Genres:</strong> {data.value?.genres.join(", ")}</span> }
                { data.value?.description && <p dangerouslySetInnerHTML={{ __html: data.value?.description }} ></p> }
            </section>
            <br />

            <section>
                { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="books">
					{data.value.books.list.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
						<inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} position={book.position} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
					</li>)}
                </ol> }
            </section>
            <br />

            <section>
            { data.value?.authors && <MoreByAuthor authors={data.value?.authors} /> }

            </section>
        </adw-clamp>
    </>;
}
