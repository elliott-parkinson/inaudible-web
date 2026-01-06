import { render, h } from 'preact';
import model from '../../../model';
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { Signal, signal } from '@preact/signals';
import { html } from 'lit-html';
import { MoreByAuthor } from '../../authors/component/more-by-author';


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

            </section>
            { /* Should ideally be a carousel */ }
            { data.value?.series?.map(series => series.books.length > 1 && <div key={series.id}>
                <h4>More in <a href={`/series/${series.id}`}>{series.name}</a></h4>
                <ol class="books">
                    {series.books.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
						<inaudible-audiobook src={book.pictureUrl} title={book.name} />
					</li>)}
                </ol>
            </div>)}

            { data.value?.authors && <MoreByAuthor authors={data.value?.authors} /> }

            <section>
            </section>

        </adw-clamp>
    </>;
}
