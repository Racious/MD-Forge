import type { DocumentType } from './markdown.types';
import fileFormats from './file-formats.json';

export type { DocumentType, RecentFile, SupportedMarkdownExtension } from './markdown.types';

// Rust dialogs include this same registry; keep extensions in one source.
export const DOCUMENT_FORMATS: Record<DocumentType, { extensions: readonly string[]; label: string; badge: string }> = fileFormats;
export const SUPPORTED_EXTENSIONS: readonly string[] = DOCUMENT_FORMATS.markdown.extensions;
export const SUPPORTED_FILE_EXTENSIONS: readonly string[] = Object.values(DOCUMENT_FORMATS).flatMap(format => [...format.extensions]);

export function extractFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function isSupportedMarkdownFile(path: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(getFileExtension(path));
}

export function isSupportedFile(path: string): boolean {
  return SUPPORTED_FILE_EXTENSIONS.includes(getFileExtension(path));
}

export function getDocumentType(path: string): DocumentType {
  const ext = getFileExtension(path);
  for (const [type, format] of Object.entries(DOCUMENT_FORMATS)) {
    if ((format.extensions as readonly string[]).includes(ext)) return type as DocumentType;
  }
  throw new Error(`Unsupported file type: ${extractFileName(path)}`);
}

export function getFileExtension(path: string): string {
  const name = extractFileName(path);
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function getSaveDefaults(type: DocumentType, fileName?: string): { defaultName: string; extension: string } {
  const format = DOCUMENT_FORMATS[type];
  const originalExtension = getFileExtension(fileName ?? '');
  const extension = (format.extensions as readonly string[]).includes(originalExtension)
    ? originalExtension : format.extensions[0];
  return { defaultName: fileName && isSupportedFile(fileName) ? fileName : `untitled.${extension}`, extension };
}
