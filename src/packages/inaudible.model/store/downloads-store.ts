import { type IDBPDatabase } from 'idb';
import type { StoredDownload } from '../interfaces/stored-download';

export class DownloadsStore {
    private _database: IDBPDatabase<unknown>;

    constructor(database: IDBPDatabase<unknown>) {
        this._database = database;
    }

    async put(item: StoredDownload) {
        const transaction = this._database.transaction('downloads', 'readwrite');
        const store = transaction.objectStore('downloads');
        await store.put(item);
        await transaction.done;
    }

    async get(id: string): Promise<StoredDownload | null> {
        const transaction = this._database.transaction('downloads', 'readonly');
        const store = transaction.objectStore('downloads');
        const result = await store.get(id);
        return (result as StoredDownload) ?? null;
    }

    async getAll(): Promise<StoredDownload[]> {
        return await this._database.getAll('downloads');
    }

    async delete(id: string) {
        const transaction = this._database.transaction('downloads', 'readwrite');
        const store = transaction.objectStore('downloads');
        await store.delete(id);
        await transaction.done;
    }
}
