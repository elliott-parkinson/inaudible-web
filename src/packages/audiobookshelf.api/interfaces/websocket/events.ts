import type { PlaybackState } from "./playback";
import type { MediaProgressUpdate } from "./media-progress";
import type { DevicePresence } from "./device";
import type { LibraryUpdate } from "./library";
import type { ServerStatus } from "./server-status";

export type RawSocketMessage = {
  event: string;
  data: unknown;
};

export interface SocketEventMap {
  playback: PlaybackState;
  mediaProgress: MediaProgressUpdate;
  device: DevicePresence;
  library: LibraryUpdate;
  serverStatus: ServerStatus;
  raw: RawSocketMessage;
  connected: void;
  disconnected: { code?: number; reason?: string };
  error: { message: string };
}
