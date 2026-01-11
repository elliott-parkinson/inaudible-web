export interface LibraryUpdate {
  libraryId?: string;
  itemId?: string;
  type?: 'itemAdded' | 'itemUpdated' | 'itemRemoved' | 'scanStarted' | 'scanCompleted' | 'metadataUpdated' | string;
  updatedAt?: number;
}
