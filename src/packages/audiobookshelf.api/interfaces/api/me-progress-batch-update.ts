import type { MediaProgress } from "../model/media-progress";
import type { MediaProgressUpdate } from "../websocket/media-progress";

export namespace MeProgressBatchUpdate {
    export type Body = { updates: MediaProgressUpdate[] } | MediaProgressUpdate[];

    export interface Request {
        body: Body;
    }

    export interface Response {
        results?: MediaProgress[];
        updated?: MediaProgress[];
        [key: string]: unknown;
    }
}
