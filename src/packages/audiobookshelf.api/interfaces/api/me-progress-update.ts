import type { MediaProgress } from "../model/media-progress";
import type { MediaProgressUpdate } from "../websocket/media-progress";

export namespace MeProgressUpdate {
    export type Body = MediaProgressUpdate;

    export interface Request {
        libraryItemId: string;
        body: Body;
    }

    export type Response = MediaProgress;
}
