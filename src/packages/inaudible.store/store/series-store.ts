import { type IDBPDatabase } from 'idb';
import type { StoredSeries } from '../interfaces/stored-series';


export class SeriesStore {
    private _database: IDBPDatabase<unknown>;

    constructor(database: IDBPDatabase<unknown>) {
        this._database = database;
    }

    upgrade(db: IDBPDatabase<unknown>) { }

    async put(book: StoredSeries) {
        const transaction = this._database.transaction('series', 'readwrite');
        const store = transaction.objectStore('series');
        await store.put(book);
        await transaction.done;
    }

    async getAll(): Promise<StoredSeries[]> {
        return this._database.getAll('series');
    }
    
    async get(id: string): Promise<StoredSeries> {
        const transaction = this._database.transaction('series', 'readonly');
        const store = transaction.objectStore('series');
        return store.get(id);
    }

    async getByName(name: string): Promise<StoredSeries> {
        const author: StoredSeries = await this._database.getFromIndex('series', 'seriesName', name);
        return author;
    }
}