import { Text } from '../types/article';
import { Folder } from '../types/folder';

export interface LibrarySearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface LibrarySearchResults {
  matchedTextIds: Set<number>;
  matchedFolderIds: Set<string>;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchRegex(query: string, options: LibrarySearchOptions): RegExp {
  const escapedQuery = escapeRegex(query);
  const pattern = options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
  const flags = options.caseSensitive ? 'g' : 'gi';
  return new RegExp(pattern, flags);
}

/**
 * Searches library texts and folders based on query and options.
 *
 * @param folders - Array of folders to search through
 * @param texts - Array of texts to search through
 * @param query - The search query string
 * @param options - Search options (case sensitivity, whole word)
 * @returns Object containing sets of matched text IDs and folder IDs
 */
export function searchLibrary(
  folders: Folder[],
  texts: Text[],
  query: string,
  options: LibrarySearchOptions
): LibrarySearchResults {
  if (!query || query.trim().length === 0) {
    return {
      matchedTextIds: new Set<number>(),
      matchedFolderIds: new Set<string>()
    };
  }

  const regex = buildSearchRegex(query, options);

  const matchedTextIds = new Set<number>();
  for (const text of texts) {
    if (regex.test(text.title)) {
      matchedTextIds.add(text.id);
    }
    regex.lastIndex = 0;
  }

  const matchedFolderIds = new Set<string>();
  for (const folder of folders) {
    if (regex.test(folder.name)) {
      matchedFolderIds.add(folder.id);
    }
    regex.lastIndex = 0;
  }

  return {
    matchedTextIds,
    matchedFolderIds
  };
}
