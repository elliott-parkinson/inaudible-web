import { openDB, type IDBPDatabase } from 'idb';

export class AudiobookStore {
    private _database: Promise<IDBPDatabase<unknown>>;
    database: IDBPDatabase<unknown>;

    constructor() {
        this._database = openDB('AudiobooksDB', 5, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('books')) {
                    const books = db.createObjectStore('books', { keyPath: 'id' });
                    books.createIndex('authorsIndex', 'authors', { multiEntry: true });
                    books.createIndex('addedAt', 'addedAt', { unique: false });
                    books.createIndex('publishedYear', 'meta.publishedYear', { unique: false });
                }

                if (!db.objectStoreNames.contains('my-library')) {
                    db.createObjectStore('my-library', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('series')) {
                    const series = db.createObjectStore('series', { keyPath: 'id' });
                    series.createIndex('seriesName', 'name', { unique: true });
                }

                if (!db.objectStoreNames.contains('authors')) {
                    const authors = db.createObjectStore('authors', { keyPath: 'id' });
                    authors.createIndex('name', 'name', { unique: true });
                }

                if (!db.objectStoreNames.contains('stored-progress')) {
                    const progress = db.createObjectStore('stored-progress', { keyPath: 'id' });
                    progress.createIndex('libraryItemId', 'libraryItemId', { unique: false });
                }

                if (!db.objectStoreNames.contains('downloads')) {
                    db.createObjectStore('downloads', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('stats')) {
                    db.createObjectStore('stats', { keyPath: 'id' });
                }
            },
        });
    }

    async init() {
        this.database = await this._database;
    }
}
