import type { AudiobookshelfApi } from "../../audiobookshelf.api/service";

export const buildApiUrl = (api: AudiobookshelfApi, path: string): string => {
    const baseUrl = api?.getBaseUrl?.() ?? "";
    if (!baseUrl) {
        return "";
    }
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const normalizedPath = path.replace(/^\/+/, "");
    return `${normalizedBase}/audiobookshelf/api/${normalizedPath}`;
};
