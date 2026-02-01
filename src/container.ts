import { AudiobookshelfApi } from "./packages/audiobookshelf.api/service";
import { Libraries } from "./packages/audiobookshelf.api/service/libraries";
import { AudiobookshelfMeApi } from "./packages/audiobookshelf.api/service/me";
import { AudiobookStore } from "./packages/inaudible.store/store";
import { AuthorStore } from "./packages/inaudible.store/store/authors-store";
import { BookStore } from "./packages/inaudible.store/store/books-store";
import { DownloadsStore } from "./packages/inaudible.store/store/downloads-store";
import { MyLibraryStore } from "./packages/inaudible.store/store/my-library-store";
import { ProgressStore } from "./packages/inaudible.store/store/progress-store";
import { SeriesStore } from "./packages/inaudible.store/store/series-store";
import { StatsStore } from "./packages/inaudible.store/store/stats-store";
import { InaudibleService } from "./packages/inaudible.service";

export const container = new Map<string, object>;


export class Container {
    store = new Map<string, object>;
     

    async init() {

    }
}

export const init = async () => {
    const apiBaseUrl = localStorage.getItem("abs_api_baseUrl") ?? "";
    const api = new AudiobookshelfApi(apiBaseUrl);
    const store = new AudiobookStore();
    const service = new InaudibleService(container);
    await store.init();

    container.set("inaudible.worker", new Worker(new URL("./packages/inaudible.worker/index.ts", import.meta.url), { type: "module" }));
    container.set("audiobookshelf.api", api);
    container.set("audiobookshelf.api.libraries", new Libraries(api));
    container.set("audiobookshelf.api.me", new AudiobookshelfMeApi(api));
    
    container.set("inaudible.service", service);

    container.set("inaudible.store", store);
    container.set("inaudible.store.authors", new AuthorStore(store.database));
    container.set("inaudible.store.books", new BookStore(store.database));
    container.set("inaudible.store.downloads", new DownloadsStore(store.database));
    container.set("inaudible.store.library", new MyLibraryStore(store.database));
    container.set("inaudible.store.series", new SeriesStore(store.database));
    container.set("inaudible.store.progress", new ProgressStore(store.database));
    container.set("inaudible.store.stats", new StatsStore(store.database));
}
