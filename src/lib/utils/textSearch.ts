export interface SearchMatch {
  start: number;
  end: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchRegex(query: string, options: SearchOptions): RegExp {
  const escapedQuery = escapeRegex(query);
  const pattern = options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
  const flags = options.caseSensitive ? 'g' : 'gi';
  return new RegExp(pattern, flags);
}

export function findMatches(
  text: string,
  query: string,
  options: SearchOptions
): SearchMatch[] {
  if (!query || query.length === 0) {
    return [];
  }

  const matches: SearchMatch[] = [];
  const regex = buildSearchRegex(query, options);
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length
    });

    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return matches;
}
