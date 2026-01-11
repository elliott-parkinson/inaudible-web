import type { StoredProgress } from "../inaudible.model/interfaces/stored-progress";


export class InaudibleMediaProgressService extends EventTarget {
    _container: Map<string, object>;

    constructor(container: Map<string, object>) {
        super();
        this._container = container;
    }

    async updateByLibraryItemId(libraryItemId: string) {
        const progressStore = this._container.get("inaudible.progress.store") as any;
        const socket = this._container.get("inaudible.api.socket") as any;

        const result = await progressStore.getByLibraryItemId(libraryItemId);

        this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: result ?? null }));


        const onSocketProgress = (data: StoredProgress) => {
            if (data.libraryItemId === libraryItemId) {
                this.dispatchEvent(new CustomEvent(`${libraryItemId}-progress`, { detail: data }));
            }

            socket.off(socket._eventNames.mediaProgress, onSocketProgress);
        }

        socket?.on(socket._eventNames.mediaProgress, onSocketProgress);
    }
}