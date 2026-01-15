import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { AudiobookshelfMeApi } from "../../audiobookshelf.api/service/me";
import type { AudiobookshelfApi } from "../../audiobookshelf.api/service";
import type { User } from "../../audiobookshelf.api/interfaces/model/user";

export const profileDetails = () => {
    const data = signal<User | null>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async () => {
        loading.value = true;
        error.value = null;
        data.value = null;

        try {
            const meApi = container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
            const profile = await meApi.get();
            data.value = profile ?? null;
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load profile";
        } finally {
            loading.value = false;
        }
    };

    const logout = async () => {
        const api = container.get("audiobookshelf.api") as AudiobookshelfApi;
        await api.logout(true);
    };

    return { data, loading, error, load, logout };
};

export default {
    details: profileDetails(),
};
