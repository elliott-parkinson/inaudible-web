import type { MouseEventHandler } from "preact"
import type { SeriesItem } from "src/packages/inaudible.view/model/series"

type Props = {
    series: SeriesItem,
    onClick: MouseEventHandler<HTMLLIElement>,
}

export const SeriesListItem = ({ series, onClick }: Props) => <li key={series.id} onClick={onClick}>
    <figure className="series">
        <img className="background" src={series.books.list[0].pictureUrl} alt="background-image" />

        {series.books.list.map((book, i) => <picture>
            <img src={book.pictureUrl} alt={book.name} />
        </picture>)}
    </figure>

    <progress max="100" value="0" />
    <span>{series.name}</span>
    <span className="total">{series.books.total} books</span>
</li>;
