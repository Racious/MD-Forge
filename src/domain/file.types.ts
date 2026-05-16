export type { RecentFile, SupportedMarkdownExtension } from './markdown.types';

export const SUPPORTED_EXTENSIONS: readonly string[] = ['md', 'markdown', 'mdx'];

export function extractFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function isSupportedMarkdownFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}
