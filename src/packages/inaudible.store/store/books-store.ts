import { type IDBPDatabase } from 'idb';
import type { LibraryItem } from 'src/packages/audiobookshelf.api/interfaces/model/library-item';
import type { StoredBook } from '../interfaces/stored-book';


export class BookStore {
    private _database: IDBPDatabase<unknown>;

    constructor(database: IDBPDatabase<unknown>) {
        this._database = database;
    }

    upgrade(db: IDBPDatabase<unknown>) { }


    async put(book: StoredBook) {
        const transaction = this._database.transaction('books', 'readwrite');
        const store = transaction.objectStore('books');
        await store.put(book);
        await transaction.done;
    }

    async getAll(): Promise<StoredBook[]> {
        return await this._database.getAll('books');
    }

    async getDiscover(limit: number): Promise<StoredBook[]> {
	    const tx = this._database.transaction('books', 'readonly');
	    const store = tx.objectStore('books');

	    const result: StoredBook[] = [];
	    let count = 0;

	    let cursor = await store.openCursor();
	    while (cursor) {
	    count++;

	    if (result.length < limit) {
	        result.push(cursor.value as StoredBook);
	    }
		else {
	        const j = Math.floor(Math.random() * count);
	        if (j < limit) {
		        result[j] = cursor.value as StoredBook;
	        }
	    }

	    cursor = await cursor.continue();
	    }

	    await tx.done;
      return result;
    }



    async get(id: string): Promise<StoredBook> {
        return await this._database.get('books', id);
    }

    async getByAuthor(authorId: string): Promise<StoredBook[]> {
        const tx = this._database.transaction('books', 'readonly');
        const store = tx.objectStore('books');
        const index = store.index('authorsIndex');

        const books = await index.getAll(authorId);
        return books.slice(0, 6);
    }

    async getMoreByAuthor(authorId: string, limit: number = 6): Promise<StoredBook[]> {
        const tx = this._database.transaction('books', 'readonly');
        const store = tx.objectStore('books');
        const index = store.index('authorsIndex');

        const reservoir: StoredBook[] = [];
        let count = 0;

        let cursor = await index.openCursor(authorId);
        while (cursor) {
            const book = cursor.value;
            if (!book.meta.seriesName) {
                count++;
                if (reservoir.length < limit) {
                    reservoir.push(book);
                } else {
                    const j = Math.floor(Math.random() * count);
                    if (j < limit) {
                        reservoir[j] = book;
                    }
                }
            }
            cursor = await cursor.continue();
        }

        return reservoir;
    }

    async getRecentlyAdded(limit: number = 6): Promise<StoredBook[]> {
        const tx = this._database.transaction('books', 'readonly');
        const store = tx.objectStore('books');
        const index = store.index('addedAt');

        const results: StoredBook[] = [];
        let cursor = await index.openCursor(null, 'prev');

        while (cursor && results.length < limit) {
            results.push(cursor.value as StoredBook);
            cursor = await cursor.continue();
        }

        return results;
    }


    async getRecentlyPublished(limit: number = 6): Promise<StoredBook[]> {
        const tx = this._database.transaction('books', 'readonly');
        const store = tx.objectStore('books');
        const index = store.index('publishedYear');

        const results: StoredBook[] = [];
        let cursor = await index.openCursor(null, 'prev');

        while (cursor && results.length < limit) {
            results.push(cursor.value as StoredBook);
            cursor = await cursor.continue();
        }

        return results;
    }


    async getBySeries(seriesId: string): Promise<StoredBook[]> {
        const books = await this.getAll();
        const filtered = books.filter(book => book.series[0]?.id == seriesId);
        const sorted = filtered.sort((a, b) => parseFloat(a.series[0].position) - parseFloat(b.series[0].position))
        return sorted;
    }
}
