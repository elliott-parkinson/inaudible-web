import { AudiobookshelfApi } from "./packages/audiobookshelf.api/service";
import { Libraries } from "./packages/audiobookshelf.api/service/libraries";
import { AudiobookshelfMeApi } from "./packages/audiobookshelf.api/service/me";
import { AudiobookStore } from "./packages/inaudible.model/store";
import { AuthorStore } from "./packages/inaudible.model/store/authors-store";
import { BookStore } from "./packages/inaudible.model/store/books-store";
import { DownloadsStore } from "./packages/inaudible.model/store/downloads-store";
import { MyLibraryStore } from "./packages/inaudible.model/store/my-library-store";
import { ProgressStore } from "./packages/inaudible.model/store/progress-store";
import { SeriesStore } from "./packages/inaudible.model/store/series-store";
import { InaudibleService } from "./packages/inaudible.service";

export const container = new Map<string, object>;



export const init = async () => {
    const apiBaseUrl = localStorage.getItem("abs_api_baseUrl") ?? "";
    const api = new AudiobookshelfApi(apiBaseUrl);
    const store = new AudiobookStore();
    const service = new InaudibleService(container);
    await store.init();

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
}
