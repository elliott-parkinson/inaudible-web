import { type IDBPDatabase } from 'idb';
import type { StoredProgress } from '../interfaces/stored-progress';

export class ProgressStore {
	private _database: IDBPDatabase<unknown>;
	private _storeName: string;

	constructor(database: IDBPDatabase<unknown>) {
		this._database = database;
		this._storeName = this._database.objectStoreNames.contains('stored-progress')
			? 'stored-progress'
			: 'progress';
	}

	private getStoreName() {
		if (this._database.objectStoreNames.contains('stored-progress')) {
			return 'stored-progress';
		}
		if (this._database.objectStoreNames.contains('progress')) {
			return 'progress';
		}
		throw new Error('No progress store available');
	}

	async put(item: StoredProgress) {
		const storeName = this.getStoreName();
		const transaction = this._database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		await store.put(item);
		await transaction.done;
	}

	async putMany(progressItems: StoredProgress[]) {
		if (!progressItems?.length) {
			return;
		}
		const storeName = this.getStoreName();
		const transaction = this._database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);

		for (const item of progressItems) {
			await store.put(item);
		}

		await transaction.done;
	}

	async getAll(): Promise<StoredProgress[]> {
		const storeName = this.getStoreName();
		return await this._database.getAll(storeName);
	}

	async getByLibraryItemId(libraryItemId: string): Promise<StoredProgress | null> {
		const storeName = this.getStoreName();
		const tx = this._database.transaction(storeName, 'readonly');
		const store = tx.objectStore(storeName);
		const index = store.index('libraryItemId');
		const result = await index.get(libraryItemId);
		return (result as StoredProgress) ?? null;
	}
}
