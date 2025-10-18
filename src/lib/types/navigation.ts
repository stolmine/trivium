export interface ReturnNavigationState {
  path: string;
  scrollPosition: number;
  textId: number;
}

export interface IngestPageLocationState {
  wikipediaUrl?: string;
  selectedFolderId?: string;
  returnTo?: ReturnNavigationState;
}

export interface ReadPageLocationState {
  restoreScrollPosition?: number;
  __fromHistory?: boolean;
}
