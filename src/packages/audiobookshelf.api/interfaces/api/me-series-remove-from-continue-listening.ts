export namespace MeSeriesRemoveFromContinueListening {
    export interface Request {
        id: string;
    }

    export interface Response {
        success?: boolean;
        [key: string]: unknown;
    }
}
