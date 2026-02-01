import { signal } from "@preact/signals";

export type PlayerPayload = {
    libraryItemId: string;
    title: string;
    author: string;
    coverUrl: string;
    startPosition: number;
    autoplay?: boolean;
};

const current = signal<PlayerPayload | null>(null);
const open = signal<boolean>(false);
const storageKey = "inaudible.player.session";
const minPersistIntervalMs = 5000;
let lastPersistAt = 0;

const persist = () => {
    if (!current.value || !open.value) {
        return;
    }
    try {
        localStorage.setItem(storageKey, JSON.stringify(current.value));
    } catch {
        return;
    }
};

const openPlayer = (payload: PlayerPayload) => {
    current.value = {
        ...payload,
        autoplay: payload.autoplay ?? true,
    };
    open.value = true;
    persist();
};

const closePlayer = () => {
    open.value = false;
    current.value = null;
    try {
        localStorage.removeItem(storageKey);
    } catch {
        return;
    }
};

const updatePosition = (position: number) => {
    if (!current.value || !Number.isFinite(position)) {
        return;
    }
    const now = Date.now();
    if (now - lastPersistAt < minPersistIntervalMs) {
        return;
    }
    lastPersistAt = now;
    current.value = {
        ...current.value,
        startPosition: position,
    };
    persist();
};

const restorePlayer = () => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return;
        }
        const parsed = JSON.parse(raw) as PlayerPayload;
        if (!parsed?.libraryItemId) {
            return;
        }
        current.value = {
            ...parsed,
            autoplay: false,
        };
        open.value = true;
    } catch {
        return;
    }
};

export default {
    current,
    open,
    openPlayer,
    closePlayer,
    updatePosition,
    restorePlayer,
};
