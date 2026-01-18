import { type IDBPDatabase } from 'idb';
import type { StoredLibraryItem } from '../interfaces/stored-library-item';

export class MyLibraryStore {
    private _database: IDBPDatabase<unknown>;

    constructor(database: IDBPDatabase<unknown>) {
        this._database = database;
    }

    async put(item: StoredLibraryItem) {
        const transaction = this._database.transaction('my-library', 'readwrite');
        const store = transaction.objectStore('my-library');
        await store.put(item);
        await transaction.done;
    }

    async putMany(items: StoredLibraryItem[]) {
        if (!items?.length) {
            return;
        }
        const transaction = this._database.transaction('my-library', 'readwrite');
        const store = transaction.objectStore('my-library');
        for (const item of items) {
            await store.put(item);
        }
        await transaction.done;
    }

    async get(id: string): Promise<StoredLibraryItem | null> {
        const transaction = this._database.transaction('my-library', 'readonly');
        const store = transaction.objectStore('my-library');
        const result = await store.get(id);
        return (result as StoredLibraryItem) ?? null;
    }

    async has(id: string): Promise<boolean> {
        const item = await this.get(id);
        return !!item;
    }

    async getAll(): Promise<StoredLibraryItem[]> {
        return await this._database.getAll('my-library');
    }
}
