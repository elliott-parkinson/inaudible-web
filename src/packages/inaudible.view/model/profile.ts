import { signal } from "@preact/signals";
import { container } from "../../../container";
import type { User } from "../../audiobookshelf.api/interfaces/model/user";
import type { InaudibleService } from "../../inaudible.service";

export const profileDetails = () => {
    const data = signal<User | null>(null);
    const loading = signal<boolean>(true);
    const error = signal<null | string>(null);

    const load = async () => {
        loading.value = true;
        error.value = null;
        data.value = null;

        try {
            const inaudible = container.get("inaudible.service") as InaudibleService;
            data.value = await inaudible.profile.getProfile();
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Failed to load profile";
        } finally {
            loading.value = false;
        }
    };

    const logout = async () => {
        const inaudible = container.get("inaudible.service") as InaudibleService;
        await inaudible.profile.logout();
    };

    return { data, loading, error, load, logout };
};

export default {
    details: profileDetails(),
};
