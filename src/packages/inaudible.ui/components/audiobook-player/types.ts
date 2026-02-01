export type LocalDownload = { tracks: Array<{ index: number; title: string; size: number; blob: Blob }> };

export type AudiobookPlayerCallbacks = {
  shouldAutoplay: () => boolean;
  onChapterUpdate: () => void;
  onPlaybackUpdate: () => void;
  onProgress: (force: boolean) => void;
  onStatus?: (message: string) => void;
  onError?: (error: unknown) => void;
};

export type PlayerConfig = { mediaItemId: string | null; apiKey: string | null; baseUrl: string | null };
