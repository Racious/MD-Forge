import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, nextTick, type App } from 'vue';
import { createPinia } from 'pinia';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { undo, undoDepth } from '@codemirror/commands';
import { language, syntaxTree } from '@codemirror/language';
import MarkdownEditor from '../components/editor/MarkdownEditor.vue';
import CodePreview from '../components/editor/CodePreview.vue';
import { useEditorStore } from '../stores/editorStore';
import { useSettingsStore } from '../stores/settingsStore';
import { documentLanguage } from '../services/editorLanguageService';
import { getDocumentType } from '../domain/file.types';

let app: App;
let root: HTMLElement;
let editor: ReturnType<typeof useEditorStore>;
let settings: ReturnType<typeof useSettingsStore>;
function open(name: string, content: string) {
  editor.openInTab({ path: `C:/fixtures/${name}`, fileName: name, type: getDocumentType(name), content, originalContent: content, isDirty: false });
}
function views(): [EditorView, EditorView] {
  const elements = root.querySelectorAll<HTMLElement>('.cm-editor');
  return [EditorView.findFromDOM(elements[0])!, EditorView.findFromDOM(elements[1])!];
}
beforeEach(() => {
  localStorage.clear();
  const pinia = createPinia();
  editor = useEditorStore(pinia); settings = useSettingsStore(pinia);
  root = document.createElement('div'); document.body.append(root);
  app = createApp({ components: { MarkdownEditor, CodePreview }, template: '<div><MarkdownEditor/><CodePreview/></div>' });
  app.use(pinia);
});
afterEach(() => { app.unmount(); root.remove(); localStorage.clear(); });

describe('shared syntax and read-only code views', () => {
  it.each([
    ['yaml', 'dark'], ['yml', 'dark'], ['yaml', 'light'], ['yml', 'light'],
  ] as const)('distinguishes YAML roles in both .%s views with %s theme', async (extension, theme) => {
    const content = '%YAML 1.2\n%TAG !custom! tag:example.com,2026:\n---\n# comment\nname: production\nquoted: "hello"\nbase: &cfg\ncopy: *cfg\ntyped: !custom value\nscript: |\n  literal\n';
    open(`roles.${extension}`, content); app.mount(root);
    settings.setTheme(theme); await nextTick();
    const [write, read] = views();
    const tokens = (view: EditorView) => [...view.dom.querySelectorAll('.cm-line > span')].map(element => ({
      text: element.textContent, color: getComputedStyle(element).color, weight: getComputedStyle(element).fontWeight,
    }));
    const writeTokens = tokens(write);
    expect(tokens(read)).toEqual(writeTokens);
    for (const directive of ['%YAML', '%TAG']) {
      const token = writeTokens.find(token => token.text?.trim() === directive);
      expect(token).toBeDefined();
      expect(token?.color).toBe(theme === 'dark' ? '#ffa657' : '#953800');
    }
    const key = writeTokens.find(token => token.text === 'name');
    const value = writeTokens.find(token => token.text === 'production');
    expect(key).toBeDefined(); expect(value).toBeDefined();
    expect(key?.color).not.toBe(value?.color);
    expect(key?.weight).toBe('600');
    expect(writeTokens.find(token => token.text === '# comment')?.color).not.toBe(key?.color);
    expect(writeTokens.find(token => token.text === '&cfg')?.color).not.toBe(value?.color);
    expect(editor.currentDocument?.content).toBe(content); expect(editor.isDirty).toBe(false);
    expect(read.state.readOnly).toBe(true);
  });
  it('restores other language palettes and retains YAML undo when switching types', async () => {
    open('roles.yml', 'name: production\n'); const yamlId = editor.activeTabId!;
    app.mount(root); const [write] = views();
    write.dispatch({ changes: { from: write.state.doc.length, insert: '# edited\n' } }); await nextTick();
    const depth = undoDepth(write.state);
    open('query.sql', 'SELECT 1;'); await nextTick();
    expect(write.state.facet(language)?.name).toBe('sql');
    expect(write.dom.querySelector('.cm-line > span')?.textContent).toBe('SELECT');
    open('plain.txt', 'name: production'); await nextTick();
    expect(write.dom.querySelectorAll('.cm-line > span')).toHaveLength(0);
    editor.switchTab(yamlId); settings.setTheme('light'); await nextTick();
    expect(undoDepth(write.state)).toBe(depth);
    const key = [...write.dom.querySelectorAll('.cm-line > span')].find(element => element.textContent === 'name');
    expect(key && getComputedStyle(key).fontWeight).toBe('600');
    undo(write); await nextTick();
    expect(editor.currentDocument?.content).toBe('name: production\n'); expect(editor.isDirty).toBe(false);
  });
  it.each(['md', 'json', 'txt', 'sql', 'yaml', 'yml'])('maps .%s to its correct CodeMirror language', extension => {
    const state = EditorState.create({ doc: 'content', extensions: documentLanguage(getDocumentType(`file.${extension}`)) });
    expect(state.facet(language)?.name ?? 'text').toBe(getDocumentType(`file.${extension}`));
  });
  it.each(['txt', 'sql', 'yaml', 'yml'])('keeps .%s literal, noneditable and free of write-back', async extension => {
    const content = '\uFEFF# 中文\r\n  <img src=x onerror=alert(1)>\r\n';
    open(`literal.${extension}`, content); app.mount(root); await nextTick();
    const [writeView, readView] = views();
    expect(readView.state.readOnly).toBe(true);
    expect(readView.state.facet(EditorView.editable)).toBe(false);
    expect(readView.dom.querySelector('img')).toBeNull();
    expect(readView.state.doc.toString()).toContain('<img src=x onerror=alert(1)>');
    // Programmatic changes are allowed by CM but must never flow into the document.
    readView.dispatch({ changes: { from: 0, insert: 'preview-only' } });
    expect(editor.currentDocument?.content).toBe(content);
    expect(editor.isDirty).toBe(false);
    writeView.dispatch({ changes: { from: writeView.state.doc.length, insert: '\n尾行' } });
    await nextTick();
    expect(editor.currentDocument?.content).toBe(content + '\r\n尾行');
    expect(readView.state.doc.toString()).toBe(writeView.state.doc.toString());
  });
  it('zoom and theme reconfiguration preserve document/dirty/undo state', async () => {
    open('a.sql', 'SELECT 1;'); app.mount(root);
    const [writeView, readView] = views();
    writeView.dispatch({ changes: { from: 7, to: 8, insert: '2' } }); await nextTick();
    const content = editor.currentDocument?.content;
    const historyCount = undoDepth(writeView.state);
    settings.setFontSize(24); settings.setPreviewFontSize(10); settings.setTheme('light');
    await nextTick();
    expect(editor.currentDocument?.content).toBe(content); expect(editor.isDirty).toBe(true);
    expect(undoDepth(writeView.state)).toBe(historyCount);
    expect(readView.state.readOnly).toBe(true);
    undo(writeView); await nextTick();
    expect(editor.currentDocument?.content).toBe('SELECT 1;'); expect(editor.isDirty).toBe(false);
  });
  it('tab switches preserve separate undo stacks and line endings', async () => {
    open('a.sql', 'SELECT 1;\r\n'); const first = editor.activeTabId!;
    app.mount(root); const [writeView] = views();
    writeView.dispatch({ changes: { from: 0, insert: '-- 中文\n' } }); await nextTick();
    open('b.yml', 'key: value\n'); const second = editor.activeTabId!; await nextTick();
    expect(writeView.state.facet(language)?.name).toBe('yaml');
    writeView.dispatch({ changes: { from: 0, insert: '# 註解\n' } }); await nextTick();
    editor.switchTab(first); await nextTick();
    expect(writeView.state.facet(language)?.name).toBe('sql');
    undo(writeView); await nextTick();
    expect(editor.currentDocument?.content).toBe('SELECT 1;\r\n');
    editor.switchTab(second); await nextTick();
    expect(editor.currentDocument?.content).toBe('# 註解\nkey: value\n');
    undo(writeView); await nextTick();
    expect(editor.currentDocument?.content).toBe('key: value\n');
  });
  it('parses SQL comments/multiline strings and YAML block scalar/anchor/tag without changing text', () => {
    for (const [type, content] of [
      ['sql', "-- 中文\nSELECT 'multi\nline'; /* block */"],
      ['yaml', 'defaults: &cfg\n  script: |\n    line1\n    line2\n  typed: !custom val\ncopy: *cfg\n'],
    ] as const) {
      const state = EditorState.create({ doc: content, extensions: documentLanguage(type) });
      expect(syntaxTree(state).length).toBe(content.length);
      expect(state.doc.toString()).toBe(content);
      expect(syntaxTree(state).toString()).not.toBe('');
    }
  });
});
