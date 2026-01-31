import type { LocalDownload, PlayerConfig } from "./types";

export interface IAudiobookPlayer {
  readonly trackList: Array<any>;
  readonly currentTrackIndex: number;
  configure(options: PlayerConfig): void;
  abort(): void;
  startStream(): Promise<void>;
  seekBy(offsetSeconds: number): void;
  switchChapter(offset: number): void;
  playTrackAtIndex(nextIndex: number): void;
  loadLocalDownload(download: LocalDownload, autoPlay: boolean): boolean;
  revokeLocalUrl(): void;
}