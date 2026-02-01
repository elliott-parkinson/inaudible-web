import { AudiobookshelfPlayer } from "./audiobookshelf-player";
import type { IAudiobookPlayer } from "./iaudiobook-player";
import { LocalPlayer } from "./local-player";
import type { AudiobookPlayerCallbacks, LocalDownload, PlayerConfig } from "./types";

export class AudiobookPlayer implements IAudiobookPlayer {
  #remote: IAudiobookPlayer;
  #local: IAudiobookPlayer;
  #usingLocal: boolean;
  #audio: HTMLAudioElement;

  constructor(callbacks: AudiobookPlayerCallbacks) {
    this.#audio = new Audio();
    this.#audio.controls = false;
    this.#remote = new AudiobookshelfPlayer(this.#audio, callbacks);
    this.#local = new LocalPlayer(this.#audio, callbacks);
    this.#usingLocal = false;
  }

  get audio(): HTMLAudioElement {
    return this.#audio;
  }

  get trackList(): Array<any> {
    return this.#usingLocal ? this.#local.trackList : this.#remote.trackList;
  }

  get currentTrackIndex(): number {
    return this.#usingLocal ? this.#local.currentTrackIndex : this.#remote.currentTrackIndex;
  }

  configure(options: PlayerConfig) {
    this.#remote.configure(options);
  }

  abort() {
    this.#remote.abort();
  }

  async startStream() {
    await this.#remote.startStream();
  }

  seekBy(offsetSeconds: number) {
    if (this.#usingLocal) {
      this.#local.seekBy(offsetSeconds);
      return;
    }
    this.#remote.seekBy(offsetSeconds);
  }

  switchChapter(offset: number) {
    if (this.#usingLocal) {
      this.#local.switchChapter(offset);
      return;
    }
    this.#remote.switchChapter(offset);
  }

  playTrackAtIndex(nextIndex: number) {
    if (this.#usingLocal) {
      this.#local.playTrackAtIndex(nextIndex);
      return;
    }
    this.#remote.playTrackAtIndex(nextIndex);
  }

  loadLocalDownload(download: LocalDownload, autoPlay: boolean) {
    const loaded = this.#local.loadLocalDownload(download, autoPlay);
    if (loaded) {
      this.#usingLocal = true;
    }
    return loaded;
  }

  revokeLocalUrl() {
    this.#local.revokeLocalUrl();
  }
}
