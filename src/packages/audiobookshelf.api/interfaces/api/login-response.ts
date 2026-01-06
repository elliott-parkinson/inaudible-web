import type { ServerSettings } from "../model/server-settings";
import type { User } from "../model/user";


export namespace Login {
    export interface Response {
        user: User;
        userDefaultLibraryId: string;
        serverSettings: ServerSettings;
        ereaderDevices: any[];
        Source: string;
    }
}
