import type { MediaProgress } from "../model/media-progress";

export namespace MeRemoveProgressFromContinueListening {
    export interface Request {
        id: string;
    }

    export interface Response {
        success?: boolean;
        progress?: MediaProgress;
        [key: string]: unknown;
    }
}
