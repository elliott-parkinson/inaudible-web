import { openDB, type IDBPDatabase } from 'idb';

export class AudiobookStore {
    private _database: Promise<IDBPDatabase<unknown>>;
    database: IDBPDatabase<unknown>;

    constructor() {
        this._database = openDB('AudiobooksDB', 1, {
            upgrade(db) {
                const books = db.createObjectStore('books', { keyPath: 'id' });
                books.createIndex('authorsIndex', 'authors', { multiEntry: true });
                books.createIndex('addedAt', 'addedAt', { unique: false });
                books.createIndex('publishedYear', 'meta.publishedYear', { unique: false });

                const myLibrary = db.createObjectStore('my-library', { keyPath: 'id' });

                const series = db.createObjectStore('series', { keyPath: 'id' });
                series.createIndex('seriesName', 'name', { unique: true });

                const authors = db.createObjectStore('authors', { keyPath: 'id' });
                authors.createIndex('name', 'name', { unique: true });
            },
        });
    }

    async init() {
        this.database = await this._database;
    }
}
