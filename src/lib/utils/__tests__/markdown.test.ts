import { describe, test, expect } from 'vitest';
import {
  isParagraphBoundary,
  findParagraphStart,
  findParagraphEnd,
  expandToParagraphBoundary,
  expandToSmartBoundary
} from '../sentenceBoundary';
import {
  insertPositionMarker,
  findMarkerPosition,
  removeMarker,
  preserveCursorThroughTransform,
  preserveSelectionThroughTransform
} from '../positionMarkers';
import {
  parseMarkdownWithPositions,
  extractLinks,
  markdownToPlainText,
  renderedPositionToSource,
  sourcePositionToRendered
} from '../markdownParser';

describe('Paragraph Boundary Detection', () => {
  test('detects paragraph boundaries at double newlines', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    expect(isParagraphBoundary(text, 16)).toBe(true);
  });

  test('finds paragraph start', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    expect(findParagraphStart(text, 25)).toBe(18);
  });

  test('finds paragraph end', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    expect(findParagraphEnd(text, 25)).toBe(35);
  });

  test('expands selection to paragraph boundaries', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const result = expandToParagraphBoundary(text, 25, 30);
    expect(result.start).toBe(18);
    expect(result.end).toBe(35);
  });

  test('smart boundary expands to sentence for single sentence', () => {
    const text = 'This is a sentence. Another sentence here.';
    const result = expandToSmartBoundary(text, 5, 10);
    expect(result.boundaryType).toBe('sentence');
  });

  test('smart boundary expands to paragraph for multi-sentence selection', () => {
    const text = 'First sentence. Second sentence.\n\nNew paragraph.';
    const result = expandToSmartBoundary(text, 0, 35);
    expect(result.boundaryType).toBe('paragraph');
  });

  test('handles emoji in paragraph detection', () => {
    const text = 'Hello 👋\n\nWorld 🌍';
    const boundary = expandToParagraphBoundary(text, 0, 5);
    expect(boundary.start).toBe(0);
    expect(boundary.end).toBe(8);
  });
});

describe('Position Markers', () => {
  test('inserts marker at position', () => {
    const text = 'Hello World';
    const { markedText, marker } = insertPositionMarker(text, 5);
    expect(markedText).toContain(marker);
    expect(markedText.indexOf(marker)).toBe(5);
  });

  test('finds marker position', () => {
    const text = 'Hello █ World';
    const position = findMarkerPosition(text, '█');
    expect(position).toBe(6);
  });

  test('removes marker from text', () => {
    const text = 'Hello █ World';
    const result = removeMarker(text, '█');
    expect(result).toBe('Hello  World');
  });

  test('preserves cursor through simple transformation', () => {
    const text = 'HELLO WORLD';
    const transform = (t: string) => t.toLowerCase();
    const result = preserveCursorThroughTransform(text, 6, transform);
    expect(result.transformedText).toBe('hello world');
    expect(result.newCursorPosition).toBe(6);
  });

  test('preserves cursor through text deletion', () => {
    const text = 'Hello Beautiful World';
    const transform = (t: string) => t.replace('Beautiful ', '');
    const result = preserveCursorThroughTransform(text, 16, transform);
    expect(result.transformedText).toBe('Hello World');
    expect(result.newCursorPosition).toBe(6);
  });

  test('preserves selection through transformation', () => {
    const text = 'HELLO WORLD';
    const transform = (t: string) => t.toLowerCase();
    const result = preserveSelectionThroughTransform(text, 0, 5, transform);
    expect(result.transformedText).toBe('hello world');
    expect(result.newStart).toBe(0);
    expect(result.newEnd).toBe(5);
  });

  test('handles emoji in marker preservation', () => {
    const text = 'Hello 👋 World';
    const { markedText, marker } = insertPositionMarker(text, 8);
    expect(markedText).toContain(marker);
    const position = findMarkerPosition(markedText, marker);
    expect(position).toBeGreaterThanOrEqual(0);
  });
});

describe('Markdown Parsing', () => {
  test('parses markdown with positions', () => {
    const markdown = '# Hello\n\nWorld';
    const ast = parseMarkdownWithPositions(markdown);
    expect(ast).toBeDefined();
    expect(ast.type).toBe('root');
  });

  test('extracts links with positions', () => {
    const markdown = 'Check out [this link](https://example.com) for more info.';
    const links = extractLinks(markdown);
    expect(links.length).toBe(1);
    expect(links[0].text).toBe('this link');
    expect(links[0].url).toBe('https://example.com');
    expect(links[0].position).toBeDefined();
  });

  test('converts markdown to plain text', () => {
    const markdown = '[click here](https://example.com)';
    const plainText = markdownToPlainText(markdown);
    expect(plainText).toBe('click here');
  });

  test('handles multiple links', () => {
    const markdown = '[first](url1) and [second](url2)';
    const links = extractLinks(markdown);
    expect(links.length).toBe(2);
    expect(links[0].text).toBe('first');
    expect(links[1].text).toBe('second');
  });

  test('handles inline code', () => {
    const markdown = 'Use `console.log()` for debugging.';
    const plainText = markdownToPlainText(markdown);
    expect(plainText).toContain('console.log()');
  });

  test('maps rendered position to source', () => {
    const markdown = '[link](url) text';
    const ast = parseMarkdownWithPositions(markdown);
    const sourcePos = renderedPositionToSource(5, markdown, ast);
    expect(sourcePos).toBeGreaterThanOrEqual(0);
  });

  test('maps source position to rendered', () => {
    const markdown = '[link](url) text';
    const ast = parseMarkdownWithPositions(markdown);
    const renderedPos = sourcePositionToRendered(1, markdown, ast);
    expect(renderedPos).toBeGreaterThanOrEqual(0);
  });

  test('handles emoji in markdown', () => {
    const markdown = 'Hello 👋 [world](url)';
    parseMarkdownWithPositions(markdown);
    const links = extractLinks(markdown);
    expect(links.length).toBe(1);
    expect(links[0].text).toBe('world');
  });

  test('handles CJK characters', () => {
    const markdown = '世界 [链接](url)';
    const links = extractLinks(markdown);
    expect(links.length).toBe(1);
    expect(links[0].text).toBe('链接');
  });
});

describe('Integration Tests', () => {
  test('preserves cursor through markdown to plain text transformation', () => {
    const markdown = '[click here](https://example.com) for more info';
    const cursorInSource = 7;

    const result = preserveCursorThroughTransform(
      markdown,
      cursorInSource,
      markdownToPlainText
    );

    expect(result.transformedText).toBe('click here for more info');
    expect(result.newCursorPosition).toBeGreaterThanOrEqual(0);
    expect(result.newCursorPosition).toBeLessThanOrEqual(result.transformedText.length);
  });

  test('combines smart boundary with markdown parsing', () => {
    const markdown = 'First sentence. Second sentence.\n\n[Link](url) in new paragraph.';
    const boundary = expandToSmartBoundary(markdown, 0, 35);
    expect(boundary.boundaryType).toBe('paragraph');

    const links = extractLinks(markdown);
    expect(links.length).toBe(1);
  });

  test('handles complex UTF-16 scenarios with markers and markdown', () => {
    const markdown = 'Hello 👋 [世界](url)';
    const { markedText, marker } = insertPositionMarker(markdown, 10);
    expect(findMarkerPosition(markedText, marker)).toBeGreaterThanOrEqual(0);

    const links = extractLinks(markdown);
    expect(links.length).toBe(1);
    expect(links[0].text).toBe('世界');
  });
});
