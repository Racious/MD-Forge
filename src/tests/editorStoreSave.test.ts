import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useEditorStore } from '../stores/editorStore';
import { useFileStore } from '../stores/fileStore';
import { invoke } from '@tauri-apps/api/core';
import { getDocumentType } from '../domain/file.types';
import type { DocumentType } from '../domain/markdown.types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: (path: string) => path }));
const call = vi.mocked(invoke);
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); call.mockReset(); });
function open(name: string, content: string, type?: DocumentType) {
  const store = useEditorStore();
  store.openInTab({ path: `C:/fixtures/${name}`, fileName: name, type: type ?? getDocumentType(name), content, originalContent: content, isDirty: false });
  return store;
}

describe('save and type transitions', () => {
  it.each(['cancel', 'failure'])('leaves JSON unchanged on Save As %s', async outcome => {
    const store = open('data.json', '{"x":1}');
    store.setContent('{"x":2}');
    const before = { ...store.currentDocument! };
    call.mockImplementation(async command => {
      if (command === 'save_file_as') return outcome === 'cancel' ? null : 'C:/new.json';
      throw new Error('write denied');
    });
    if (outcome === 'cancel') await store.saveDocumentAs();
    else await expect(store.saveDocumentAs()).rejects.toThrow('write denied');
    expect(store.currentDocument).toEqual(before);
    expect(call).toHaveBeenNthCalledWith(1, 'save_file_as', { defaultName: 'data.json', extension: 'json' });
  });
  it('leaves JSON unchanged on ordinary save failure', async () => {
    const store = open('data.json', '{"x":1}');
    const before = { ...store.currentDocument! };
    call.mockRejectedValue(new Error('write denied'));
    await expect(store.saveDocument()).rejects.toThrow('write denied');
    expect(store.currentDocument).toEqual(before);
  });
  it('updates preview/TOC immediately after cross-type Save As', async () => {
    const store = open('old.md', '# Heading');
    expect(store.toc).toHaveLength(1);
    call.mockResolvedValueOnce('C:/new.SQL').mockResolvedValueOnce(undefined);
    await store.saveDocumentAs();
    expect(store.documentType).toBe('sql');
    expect(store.toc).toEqual([]); expect(store.renderedHtml).toBe('');
    expect(store.currentDocument?.isDirty).toBe(false);
    expect(call).toHaveBeenNthCalledWith(2, 'save_file', { path: 'C:/new.SQL', content: '# Heading' });
    call.mockResolvedValueOnce('C:/again.md').mockResolvedValueOnce(undefined);
    await store.saveDocumentAs();
    expect(store.documentType).toBe('markdown'); expect(store.toc).toHaveLength(1);
  });
  it('preserves .yml naming, aliases and literal text', async () => {
    const content = '\uFEFF# 中文\r\ndefaults: &cfg\r\n  tag: !custom value\r\n  script: |\r\n    <img src=x onerror=alert(1)>\r\ncopy: *cfg\r\n';
    const store = open('部署.YML', content);
    call.mockResolvedValueOnce('C:/部署.YML').mockResolvedValueOnce(undefined);
    await store.saveDocumentAs();
    expect(call).toHaveBeenNthCalledWith(1, 'save_file_as', { defaultName: '部署.YML', extension: 'yml' });
    expect(call).toHaveBeenNthCalledWith(2, 'save_file', { path: 'C:/部署.YML', content });
    expect(store.currentDocument?.content).toBe(content);
  });
  it('does not format JSON when saving it as SQL', async () => {
    const store = open('data.json', '{"x":1}');
    call.mockResolvedValueOnce('C:/data.sql').mockResolvedValueOnce(undefined);
    await store.saveDocumentAs();
    expect(store.currentDocument?.content).toBe('{"x":1}');
    expect(store.documentType).toBe('sql');
  });
  it('keeps JSON format-on-save while preserving BOM and line separator', async () => {
    const store = open('data.json', '\uFEFF{\r\n"x":1}');
    call.mockResolvedValueOnce('C:/data.json').mockResolvedValueOnce(undefined);
    await store.saveDocumentAs();
    expect(store.currentDocument?.content).toBe('\uFEFF{\r\n  "x": 1\r\n}');
  });
  it('rejects unsupported destinations before writing or changing the document', async () => {
    const store = open('a.txt', 'raw');
    const before = { ...store.currentDocument! };
    call.mockResolvedValueOnce('C:/out.exe');
    await expect(store.saveDocumentAs()).rejects.toThrow('Unsupported file type');
    expect(call).toHaveBeenCalledTimes(1); expect(store.currentDocument).toEqual(before);
  });
  it('does not lose edits made while a write is pending', async () => {
    const store = open('a.sql', 'SELECT 1;');
    let finish!: () => void;
    call.mockImplementation(async command => command === 'save_file_as'
      ? 'C:/b.sql' : new Promise<void>(resolve => { finish = resolve; }));
    const saving = store.saveDocumentAs();
    await Promise.resolve(); await Promise.resolve();
    store.setContent('SELECT 2;'); finish(); await saving;
    expect(store.currentDocument?.content).toBe('SELECT 2;');
    expect(store.currentDocument?.originalContent).toBe('SELECT 1;');
    expect(store.isDirty).toBe(true);
  });
  it('finishes a save on its originating tab without clearing the current tab TOC', async () => {
    const store = open('a.md', '# First');
    let choose!: (path: string) => void;
    call.mockImplementation(async command => command === 'save_file_as'
      ? new Promise<string>(resolve => { choose = resolve; }) : undefined);
    const saving = store.saveDocumentAs();
    const first = store.tabs[0];
    store.openInTab({ path: 'C:/second.md', fileName: 'second.md', type: 'markdown', content: '# Second', originalContent: '# Second', isDirty: false });
    choose('C:/first.txt'); await saving;
    expect(first.document.type).toBe('text'); expect(store.documentType).toBe('markdown');
    expect(store.toc[0].text).toBe('Second');
    store.switchTab(first.id); expect(store.toc).toEqual([]);
  });
});

describe('open and session paths', () => {
  function cacheLegacySession(activeTabId = 'legacy') {
    const content = '\uFEFFUNSAVED 中文\r\n  <script>literal</script>\r\n';
    localStorage.setItem('mdforge_session', JSON.stringify({ tabs: [
      { id: 'legacy', fileName: 'legacy.HTML', path: 'C:/legacy.HTML', type: 'markdown', content, originalContent: 'old', isDirty: true, lineEnding: '\r\n' },
      { id: 'clean', fileName: 'old.log', path: 'C:/old.log', content: 'on disk', originalContent: 'on disk', isDirty: false },
      { id: 'md', fileName: 'untitled.md', path: null, content: '# Keep', originalContent: '# Keep', isDirty: false },
    ], activeTabId }));
    return content;
  }
  it('preserves legacy unsaved text through other edits and another session restore', async () => {
    const content = cacheLegacySession('md');
    const store = useEditorStore();
    expect(await store.restoreSession()).toBe(true);
    expect(store.tabs.map(tab => tab.id)).toEqual(['legacy', 'md']);
    expect(store.activeTabId).toBe('md');
    expect(store.tabs[0].document).toMatchObject({ path: null, fileName: 'legacy.HTML.txt', type: 'text', content, originalContent: 'old', isDirty: true, lineEnding: '\r\n' });
    expect(call).not.toHaveBeenCalled();
    store.setContent('# Edited supported tab');
    setActivePinia(createPinia());
    const restored = useEditorStore();
    expect(await restored.restoreSession()).toBe(true);
    restored.switchTab('legacy');
    expect(restored.currentDocument?.content).toBe(content);
    expect(restored.isDirty).toBe(true);
    expect(restored.documentType).toBe('text');
    expect(restored.toc).toEqual([]);
  });
  it.each(['cancel', 'failure', 'success'])('requires Save As for recovered legacy text: %s', async outcome => {
    const content = cacheLegacySession();
    const store = useEditorStore();
    await store.restoreSession();
    expect(store.activeTabId).toBe('legacy');
    const before = { ...store.currentDocument! };
    call.mockImplementation(async command => {
      if (command === 'save_file_as') return outcome === 'cancel' ? null : 'C:/recovered.txt';
      if (outcome === 'failure') throw new Error('write denied');
    });
    if (outcome === 'failure') await expect(store.saveDocument()).rejects.toThrow('write denied');
    else await store.saveDocument();
    expect(call).toHaveBeenNthCalledWith(1, 'save_file_as', { defaultName: 'legacy.HTML.txt', extension: 'txt' });
    if (outcome === 'success') {
      expect(call).toHaveBeenNthCalledWith(2, 'save_file', { path: 'C:/recovered.txt', content });
      expect(store.currentDocument).toMatchObject({ path: 'C:/recovered.txt', fileName: 'recovered.txt', type: 'text', content, originalContent: content, isDirty: false });
    } else expect(store.currentDocument).toEqual(before);
  });
  it.each(['txt', 'SQL', 'yaml', 'YML'])('opens recent file .%s using the shared mapping', async extension => {
    call.mockResolvedValueOnce('中文\r\n  raw\r\n');
    await useFileStore().openFileByPath(`C:/recent.${extension}`);
    expect(useEditorStore().documentType).toBe(getDocumentType(`file.${extension}`));
    expect(useEditorStore().currentDocument?.lineEnding).toBe('\r\n');
  });
  it('rejects unsupported recent files without reading them', async () => {
    await expect(useFileStore().openFileByPath('C:/a.html')).rejects.toThrow('Unsupported file type');
    expect(call).not.toHaveBeenCalled();
  });
  it('restores dirty text, line ending and actual type even with stale cached type', async () => {
    localStorage.setItem('mdforge_session', JSON.stringify({ tabs: [
      { id: 'yaml', fileName: 'a.YML', path: 'C:/a.YML', type: 'markdown', content: '# new\r\n', originalContent: '# old\r\n', isDirty: true, lineEnding: '\r\n' },
      { id: 'txt', fileName: 'a.txt', path: 'C:/a.txt', type: 'markdown', content: 'old', originalContent: 'old', isDirty: false },
      { id: 'invalid', fileName: 'a.exe', path: 'C:/a.exe', content: 'skip', isDirty: false },
    ], activeTabId: 'yaml' }));
    call.mockResolvedValueOnce('# disk\r\n').mockResolvedValueOnce('new disk');
    const store = useEditorStore();
    expect(await store.restoreSession()).toBe(true);
    expect(store.tabs.map(tab => tab.document.type)).toEqual(['yaml', 'text']);
    expect(store.currentDocument?.content).toBe('# new\r\n');
    expect(store.currentDocument?.lineEnding).toBe('\r\n');
    expect(store.toc).toEqual([]);
    store.switchTab('txt'); expect(store.currentDocument?.content).toBe('new disk');
  });
  it('ignores corrupt line-ending metadata rather than inserting it between lines', async () => {
    localStorage.setItem('mdforge_session', JSON.stringify({ tabs: [
      { id: 'txt', fileName: 'a.txt', path: null, content: 'changed\r\n', originalContent: 'old\r\n', isDirty: true, lineEnding: 'corrupt' },
    ], activeTabId: 'txt' }));
    const store = useEditorStore();
    expect(await store.restoreSession()).toBe(true);
    expect(store.currentDocument?.lineEnding).toBe('\r\n');
    store.saveSession();
    expect(JSON.parse(localStorage.getItem('mdforge_session')!).tabs[0].lineEnding).toBe('\r\n');
  });
});
