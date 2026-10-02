import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { detectLineEnding, normalizeEditorText } from '../services/documentTextService';

describe('raw text round trips through CodeMirror', () => {
  const bodies = ['中文\n  # 註解\n', '\uFEFF中文\r\n  # 註解\r\n', '中文\r\n末行', '單行', 'a\rb\r', ''];
  it.each(bodies)('retains original and edited text %j', content => {
    const state = EditorState.create({ doc: content });
    const ending = detectLineEnding(content);
    expect(state.doc.toString()).toBe(normalizeEditorText(content));
    expect(state.doc.sliceString(0, state.doc.length, ending)).toBe(content);
    const edited = state.update({ changes: { from: state.doc.length, insert: '\n尾行' } }).state;
    expect(edited.doc.sliceString(0, edited.doc.length, ending)).toBe(content + ending + '尾行');
  });
});
