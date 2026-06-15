import type { DocumentType } from './markdown.types';

export type { DocumentType, RecentFile, SupportedMarkdownExtension } from './markdown.types';

export const SUPPORTED_EXTENSIONS: readonly string[] = ['md', 'markdown', 'mdx'];
export const SUPPORTED_FILE_EXTENSIONS: readonly string[] = [...SUPPORTED_EXTENSIONS, 'json'];

export function extractFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function isSupportedMarkdownFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function isSupportedFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_FILE_EXTENSIONS.includes(ext);
}

export function getDocumentType(path: string): DocumentType {
  return path.split('.').pop()?.toLowerCase() === 'json' ? 'json' : 'markdown';
}
