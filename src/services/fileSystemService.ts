import { invoke } from '@tauri-apps/api/core';
import type { DocumentType, MarkdownDocument } from '../domain/markdown.types';
import { extractFileName, getDocumentType } from '../domain/file.types';

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
  return invoke<string>('read_file', { path });
}

export async function saveFile(path: string, content: string): Promise<void> {
  return invoke<void>('save_file', { path, content });
}

export async function saveFileAs(content: string, type: DocumentType): Promise<string | null> {
  return invoke<string | null>('save_file_as', {
    content,
    defaultName: type === 'json' ? 'untitled.json' : 'untitled.md',
    extension: type === 'json' ? 'json' : 'md',
  });
}

export async function saveHtmlFile(content: string, defaultName: string): Promise<string | null> {
  return invoke<string | null>('save_html_file', { content, defaultName });
}
