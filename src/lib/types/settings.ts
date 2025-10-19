export interface Setting {
  key: string;
  value: string;
}

export type SettingsTab = 'defaults' | 'database' | 'reset';

export interface ResetResult {
  readRangesCount?: number;
  flashcardsCount?: number;
  marksCount?: number;
  textsCount?: number;
  foldersCount?: number;
}
