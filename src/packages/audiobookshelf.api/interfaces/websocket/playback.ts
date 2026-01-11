export interface PlaybackState {
  sessionId?: string;
  libraryItemId?: string;
  mediaItemId?: string;
  playing?: boolean;
  currentTime?: number;
  duration?: number;
  speed?: number;
  volume?: number;
}
