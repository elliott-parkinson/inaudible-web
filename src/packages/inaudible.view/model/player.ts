import { signal } from "@preact/signals";

export type PlayerPayload = {
    libraryItemId: string;
    title: string;
    coverUrl: string;
    startPosition: number;
};

const current = signal<PlayerPayload | null>(null);
const open = signal<boolean>(false);

const openPlayer = (payload: PlayerPayload) => {
    current.value = payload;
    open.value = true;
};

const closePlayer = () => {
    open.value = false;
    current.value = null;
};

export default {
    current,
    open,
    openPlayer,
    closePlayer,
};
