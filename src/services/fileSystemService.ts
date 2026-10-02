import { invoke } from '@tauri-apps/api/core';
import type { DocumentType, MarkdownDocument } from '../domain/markdown.types';
import { extractFileName, getDocumentType, getSaveDefaults } from '../domain/file.types';
import { formatJsonContent } from './documentTextService';

export async function openSupportedFile(): Promise<MarkdownDocument | null> {
  const result = await invoke<[string, string] | null>('open_supported_file');
  if (!result) return null;
  const [path, content] = result;
  return {
    path,
    fileName: extractFileName(path),
    type: getDocumentType(path),
    content,
    originalContent: content,
    isDirty: false,
    lastOpenedAt: new Date().toISOString(),
  };
}

export async function readFile(path: string): Promise<string> {
  getDocumentType(path);
  return invoke<string>('read_file', { path });
}

export async function saveFile(path: string, content: string): Promise<void> {
  return invoke<void>('save_file', { path, content });
}

export async function saveFileAs(
  content: string, type: DocumentType, fileName?: string, formatJsonOnSave = false,
): Promise<{ path: string; content: string; type: DocumentType } | null> {
  // Pick first, validate and write second. Cancel/failure never mutates the document.
  const path = await invoke<string | null>('save_file_as', getSaveDefaults(type, fileName));
  if (!path) return null;
  const destinationType = getDocumentType(path);
  const savedContent = type === 'json' && destinationType === 'json' && formatJsonOnSave
    ? formatJsonContent(content) : content;
  await saveFile(path, savedContent);
  return { path, content: savedContent, type: destinationType };
}

export async function saveHtmlFile(content: string, defaultName: string): Promise<string | null> {
  return invoke<string | null>('save_html_file', { content, defaultName });
}
