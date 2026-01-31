import type { LibraryAuthor } from "../../audiobookshelf.api/interfaces/model/library-author";
import type { LibraryItem } from "../../audiobookshelf.api/interfaces/model/library-item";
import type { LibrarySeries } from "../../audiobookshelf.api/interfaces/model/library-series";
import type { AudiobookshelfApi } from "../../audiobookshelf.api/service";

import type { StoredSeries } from "../../inaudible.store/interfaces/stored-series";
import type { StoredAuthor } from "../../inaudible.store/interfaces/stored-author";
import type { StoredBook } from "../../inaudible.store/interfaces/stored-book";

export class AudiobookshelfToInaudibleDataAdapter {
    _container: Map<string, object>;

    constructor(container: Map<string, object>) {
        this._container = container;
    }


    book(book: LibraryItem): StoredBook {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        return {
            id: book.id,
            ino: book.ino,
            libraryId: book.libraryId,
            authors: [],

            series: [],

            addedAt: book.addedAt,
            updatedAt: book.updatedAt,
            isMissing: book.isMissing,
            isInvalid: book.isInvalid,
            isComplete: false,
            percentComplete: 0,

            meta: {
                title: book.media.metadata.title,
                subtitle: book.media.metadata.subtitle,
                authorName: book.media.metadata.authorName,
                narratorName: book.media.metadata.narratorName,
                seriesName: book.media.metadata.seriesName,
                genres: [...book.media.metadata.genres],
                publishedYear: book.media.metadata.publishedYear,
                publishedDate: book.media.metadata.publishedDate,
                publisher: book.media.metadata.publisher ,
                description: book.media.metadata.description,
                language: book.media.metadata.language,
                explicit: book.media.metadata.explicit,
                abridged: book.media.metadata.abridged,
            },
            tags: [...book.media.tags],
            duration: book.media.duration,
        }
    }
    series(series: LibrarySeries): StoredSeries {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        return {
            id: series.id,
            name: series.nameIgnorePrefix,
            description: series.description,
            updatedAt: series.updatedAt,
            addedAt: series.addedAt,
            books: series.books.map(book => ({
                id: book.id,
                name: book.media.metadata.title,
                position: book.media.metadata.seriesName.split("#")[1],
                pictureUrl: `${api.getBaseUrl()}/audiobookshelf/api/items/${book.id}/cover`
            }))
        }
    }
    author(author: LibraryAuthor): StoredAuthor {
        const api = this._container.get("audiobookshelf.api") as AudiobookshelfApi;
        return {
            id: author.id,
            asin: author.asin,
            name: author.name,
            description: author.description,
            imagePath: author.imagePath,
            libraryId: author.libraryId,
            addedAt: author.addedAt,
            updatedAt: author.updatedAt,
            numBooks: author.numBooks,
        }
    }
}
