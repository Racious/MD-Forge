import type { LineEnding } from '../domain/markdown.types';

export function detectLineEnding(content: string): LineEnding {
  return (content.match(/\r\n|\r|\n/)?.[0] as LineEnding | undefined) ?? '\n';
}

export function normalizeEditorText(content: string): string {
  return content.replace(/\r\n|\r/g, '\n');
}

export function formatJsonContent(content: string): string {
  const bom = content.startsWith('\uFEFF') ? '\uFEFF' : '';
  try {
    const formatted = JSON.stringify(JSON.parse(content.slice(bom.length)), null, 2);
    return bom + formatted.replace(/\n/g, detectLineEnding(content));
  } catch {
    return content;
  }
}
