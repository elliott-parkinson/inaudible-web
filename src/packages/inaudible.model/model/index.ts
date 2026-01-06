export type Book = {
    progress: number,
    completed: boolean,
    started: boolean,
    name: string,
    description: string,
}

export class InaudibleStore {
    books: Book[];


    async store() {

    }

    async load() {

    }
}


export class InaudibleModel {
    store: InaudibleStore


    constructor() {
        this.store = new InaudibleStore();
    }
    
}
