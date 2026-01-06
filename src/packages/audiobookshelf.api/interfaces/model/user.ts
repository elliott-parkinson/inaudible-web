import type { MediaProgress } from "./media-progress";
import type { Permissions } from "./permissions";

export interface User {
    id: string;
    username: string;
    email: string;
    type: string;
    token: string;
    mediaProgress: MediaProgress[];
    seriesHideFromContinueListening: string[];
    bookmarks: any[];
    isActive: boolean;
    isLocked: boolean;
    lastSeen: number;
    createdAt: number;
    permissions: Permissions;
    librariesAccessible: any[];
    itemTagsSelected: any[];
    hasOpenIDLink: boolean;
    refreshToken: string | null;
    accessToken: string;
}