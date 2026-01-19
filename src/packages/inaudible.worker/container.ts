import { AudiobookshelfApi } from "../audiobookshelf.api/service";
import { Libraries } from "../audiobookshelf.api/service/libraries";
import { AudiobookshelfMeApi } from "../audiobookshelf.api/service/me";
import { AudiobookStore } from "../inaudible.model/store";
import { AuthorStore } from "../inaudible.model/store/authors-store";
import { BookStore } from "../inaudible.model/store/books-store";
import { DownloadsStore } from "../inaudible.model/store/downloads-store";
import { MyLibraryStore } from "../inaudible.model/store/my-library-store";
import { ProgressStore } from "../inaudible.model/store/progress-store";
import { SeriesStore } from "../inaudible.model/store/series-store";
import { InaudibleService } from "../inaudible.service";

export const container = new Map<string, object>;
export type Container = typeof container;


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
