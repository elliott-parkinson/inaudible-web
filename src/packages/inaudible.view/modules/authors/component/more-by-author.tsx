import { render, h } from 'preact';
import { useLocation, useRoute } from 'preact-iso';

const controller = () => {
    const route = useRoute();
    const location = useLocation();

    return {
        route,
        location,
    }
}

export const MoreByAuthor = ({ authors }) => {
    const {
        route,
        location,
    } = controller();

    return <>
        { authors?.map(author => author.books.length > 1 && <>
            <h4>More from <a href={`/authors/${author.id}`}>{author.name}</a></h4>
            <ol class="books">
                {author.books.map(book => <li key={book.id} onClick={() => location.route(`/books/${book.id}`)}>
					<inaudible-audiobook libraryItemId={book.id} src={book.pictureUrl} title={book.name} position={book.position} progress={Math.round(((book.progress ?? 0) <= 1 ? (book.progress ?? 0) * 100 : (book.progress ?? 0)))} />
				</li>)}
            </ol>
        </>)}
    </>
}
