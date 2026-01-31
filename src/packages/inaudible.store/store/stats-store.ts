import { type IDBPDatabase } from 'idb';
import type { StoredStats } from '../interfaces/stored-stats';

export class StatsStore {
    private _database: IDBPDatabase<unknown>;
    private _storeName: string;

    constructor(database: IDBPDatabase<unknown>) {
        this._database = database;
        this._storeName = this._database.objectStoreNames.contains('stats')
            ? 'stats'
            : 'stored-stats';
    }

    private getStoreName() {
        if (this._database.objectStoreNames.contains('stats')) {
            return 'stats';
        }
        if (this._database.objectStoreNames.contains('stored-stats')) {
            return 'stored-stats';
        }
        throw new Error('No stats store available');
    }

    async put(item: StoredStats) {
        const storeName = this.getStoreName();
        const transaction = this._database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.put(item);
        await transaction.done;
    }

    async get(id: string): Promise<StoredStats | null> {
        const storeName = this.getStoreName();
        const tx = this._database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const result = await store.get(id);
        return (result as StoredStats) ?? null;
    }
}
