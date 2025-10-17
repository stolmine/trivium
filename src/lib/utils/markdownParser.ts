import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Link, Text, Node } from 'mdast';

export interface MarkdownPosition {
  start: number;
  end: number;
}

export interface MarkdownNode {
  type: string;
  position: MarkdownPosition;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

export function parseMarkdownWithPositions(markdown: string): Root {
  const processor = unified().use(remarkParse);

  const ast = processor.parse(markdown);

  return ast as Root;
}

export function extractLinks(markdown: string): Array<{
  text: string;
  url: string;
  position: MarkdownPosition;
}> {
  const ast = parseMarkdownWithPositions(markdown);
  const links: Array<{
    text: string;
    url: string;
    position: MarkdownPosition;
  }> = [];

  visit(ast, 'link', (node: Link) => {
    if (!node.position || !node.position.start || !node.position.end) {
      return;
    }

    let text = '';
    if (node.children && node.children.length > 0) {
      visit(node, 'text', (textNode: Text) => {
        text += textNode.value || '';
      });
    }

    links.push({
      text,
      url: node.url,
      position: {
        start: node.position.start.offset || 0,
        end: node.position.end.offset || 0
      }
    });
  });

  return links;
}

export function markdownToPlainText(markdown: string): string {
  const ast = parseMarkdownWithPositions(markdown);
  let plainText = '';

  visit(ast, (node: Node) => {
    if (node.type === 'text') {
      const textNode = node as Text;
      plainText += textNode.value || '';
    } else if (node.type === 'inlineCode') {
      const codeNode = node as any;
      plainText += codeNode.value || '';
    }
  });

  return plainText;
}

interface PositionMapping {
  sourceStart: number;
  sourceEnd: number;
  renderedStart: number;
  renderedEnd: number;
}

function buildPositionMappings(_markdown: string, ast: Root): PositionMapping[] {
  const mappings: PositionMapping[] = [];
  let renderedOffset = 0;

  visit(ast, (node: Node) => {
    if (node.type === 'text') {
      const textNode = node as Text;
      const text = textNode.value || '';

      if (node.position && node.position.start && node.position.end) {
        mappings.push({
          sourceStart: node.position.start.offset || 0,
          sourceEnd: node.position.end.offset || 0,
          renderedStart: renderedOffset,
          renderedEnd: renderedOffset + text.length
        });

        renderedOffset += text.length;
      }
    } else if (node.type === 'inlineCode') {
      const codeNode = node as any;
      const text = codeNode.value || '';

      if (node.position && node.position.start && node.position.end) {
        mappings.push({
          sourceStart: node.position.start.offset || 0,
          sourceEnd: node.position.end.offset || 0,
          renderedStart: renderedOffset,
          renderedEnd: renderedOffset + text.length
        });

        renderedOffset += text.length;
      }
    }
  });

  return mappings;
}

export function renderedPositionToSource(
  renderedPosition: number,
  markdown: string,
  ast: Root
): number {
  const mappings = buildPositionMappings(markdown, ast);

  for (const mapping of mappings) {
    if (renderedPosition >= mapping.renderedStart && renderedPosition <= mapping.renderedEnd) {
      const offset = renderedPosition - mapping.renderedStart;
      return mapping.sourceStart + offset;
    }
  }

  if (mappings.length > 0) {
    const lastMapping = mappings[mappings.length - 1];
    if (renderedPosition >= lastMapping.renderedEnd) {
      return lastMapping.sourceEnd + (renderedPosition - lastMapping.renderedEnd);
    }
  }

  return renderedPosition;
}

export function sourcePositionToRendered(
  sourcePosition: number,
  markdown: string,
  ast: Root
): number {
  const mappings = buildPositionMappings(markdown, ast);

  for (const mapping of mappings) {
    if (sourcePosition >= mapping.sourceStart && sourcePosition <= mapping.sourceEnd) {
      const offset = sourcePosition - mapping.sourceStart;
      return mapping.renderedStart + offset;
    }
  }

  if (mappings.length > 0) {
    const lastMapping = mappings[mappings.length - 1];
    if (sourcePosition >= lastMapping.sourceEnd) {
      return lastMapping.renderedEnd + (sourcePosition - lastMapping.sourceEnd);
    }
  }

  return sourcePosition;
}
