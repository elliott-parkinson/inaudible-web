import type { AudiobookshelfMeApi } from "../audiobookshelf.api/service/me";
import type { AudiobookshelfApi } from "../audiobookshelf.api/service";
import type { User } from "../audiobookshelf.api/interfaces/model/user";

export class ProfileService {
    private container: Map<string, object>;

    constructor(container: Map<string, object>) {
        this.container = container;
    }

    async getProfile(): Promise<User | null> {
        const meApi = this.container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
        return meApi.get();
    }

    async logout() {
        const api = this.container.get("audiobookshelf.api") as AudiobookshelfApi;
        await api.logout(true);
    }
}
