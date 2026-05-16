import { invoke } from '@tauri-apps/api/core';
import type { MarkdownDocument } from '../domain/markdown.types';
import { extractFileName } from '../domain/file.types';

export async function openMarkdownFile(): Promise<MarkdownDocument | null> {
  const result = await invoke<[string, string] | null>('open_markdown_file');
  if (!result) return null;
  const [path, content] = result;
  return {
    path,
    fileName: extractFileName(path),
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

export async function saveFileAs(content: string): Promise<string | null> {
  return invoke<string | null>('save_file_as', { content });
}

export async function saveHtmlFile(content: string, defaultName: string): Promise<string | null> {
  return invoke<string | null>('save_html_file', { content, defaultName });
}
