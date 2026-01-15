import { container } from "../../../container";
import type { AudiobookshelfApi } from "../../audiobookshelf.api/service";

export const buildApiUrl = (path: string): string => {
    const api = container.get("audiobookshelf.api") as AudiobookshelfApi | undefined;
    const baseUrl = api?.getBaseUrl?.() ?? "";
    if (!baseUrl) {
        return "";
    }
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const normalizedPath = path.replace(/^\/+/, "");
    return `${normalizedBase}/audiobookshelf/api/${normalizedPath}`;
};
