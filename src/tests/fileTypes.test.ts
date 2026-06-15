import { describe, it, expect } from 'vitest';
import {
  extractFileName,
  getDocumentType,
  isSupportedFile,
  isSupportedMarkdownFile,
} from '../domain/file.types';

describe('extractFileName', () => {
  it('extracts from unix path', () => {
    expect(extractFileName('/home/user/docs/README.md')).toBe('README.md');
  });

  it('extracts from windows path', () => {
    expect(extractFileName('C:\\Users\\user\\docs\\AGENTS.md')).toBe('AGENTS.md');
  });

  it('returns original if no separator', () => {
    expect(extractFileName('file.md')).toBe('file.md');
  });
});

describe('isSupportedMarkdownFile', () => {
  it('accepts .md', () => expect(isSupportedMarkdownFile('README.md')).toBe(true));
  it('accepts .markdown', () => expect(isSupportedMarkdownFile('notes.markdown')).toBe(true));
  it('accepts .mdx', () => expect(isSupportedMarkdownFile('page.mdx')).toBe(true));
  it('rejects .txt', () => expect(isSupportedMarkdownFile('notes.txt')).toBe(false));
  it('rejects .html', () => expect(isSupportedMarkdownFile('index.html')).toBe(false));
  it('is case-insensitive', () => expect(isSupportedMarkdownFile('FILE.MD')).toBe(true));
});

describe('isSupportedFile', () => {
  it('accepts markdown files', () => expect(isSupportedFile('README.md')).toBe(true));
  it('accepts JSON files', () => expect(isSupportedFile('settings.json')).toBe(true));
  it('accepts uppercase JSON extensions', () => expect(isSupportedFile('DATA.JSON')).toBe(true));
  it('rejects unsupported files', () => expect(isSupportedFile('notes.txt')).toBe(false));
});

describe('getDocumentType', () => {
  it('detects JSON files', () => expect(getDocumentType('settings.json')).toBe('json'));
  it('defaults supported markdown extensions to markdown', () => expect(getDocumentType('README.mdx')).toBe('markdown'));
});
