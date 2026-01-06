import { AudiobookshelfApi } from "./packages/audiobookshelf.api/service";
import { Libraries } from "./packages/audiobookshelf.api/service/libraries";
import { AudiobookStore } from "./packages/inaudible.model/store";
import { AuthorStore } from "./packages/inaudible.model/store/authors-store";
import { BookStore } from "./packages/inaudible.model/store/books-store";
import { SeriesStore } from "./packages/inaudible.model/store/series-store";
import { InaudibleService } from "./packages/inaudible.service";

export const container = new Map<string, object>;

export const init = async () => {
    const api = new AudiobookshelfApi("https://audible.hylia.network");
    const store = new AudiobookStore();
    const service = new InaudibleService(container);
    await store.init();

    container.set("audiobookshelf.api", api);
    container.set("inaudible.api.libraries", new Libraries(api));
    container.set("inaudible.store", store);
    container.set("inaudible.service", service);
    container.set("inaudible.store.authors", new AuthorStore(store.database));
    container.set("inaudible.store.books", new BookStore(store.database));
    container.set("inaudible.store.series", new SeriesStore(store.database));
}

