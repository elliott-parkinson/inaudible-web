export type MediaProgressUpdate = {
  id?: string;
  libraryItemId: string;
  currentTime?: number;
  duration?: number;
  progress?: number;
  lastUpdate?: number;
  [key: string]: unknown;
};
