import { type IDBPDatabase } from 'idb';
import type { LibraryItem } from 'src/packages/audiobookshelf.api/interfaces/model/library-item';
import type { StoredBook } from '../interfaces/stored-book';
import type { StoredAuthor } from '../interfaces/stored-author';


export class AuthorStore {
    private _database: IDBPDatabase<unknown>;

    constructor(database: IDBPDatabase<unknown>) {
        this._database = database;
    }

    upgrade(db: IDBPDatabase<unknown>) { }

    async put(book: StoredAuthor) {
        const transaction = this._database.transaction('authors', 'readwrite');
        const store = transaction.objectStore('authors');
        await store.put(book);
        await transaction.done;
    }

    async getAll(): Promise<StoredAuthor[]> {
        return this._database.getAll('authors');
    }

    async getByName(name: string): Promise<StoredAuthor> {
        return await this._database.getFromIndex('authors', 'name', name);
    }

    async get(id: string): Promise<StoredAuthor> {
        return this._database.get('authors', id);
    }
}