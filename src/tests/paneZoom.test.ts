import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, ref, type App } from 'vue';
import { createPinia } from 'pinia';
import { usePaneZoom } from '../composables/usePaneZoom';
import { useSettingsStore } from '../stores/settingsStore';
import type { ViewMode } from '../domain/markdown.types';

let app: App;
let host: HTMLDivElement;
let root: HTMLDivElement;
let editor: HTMLElement;
let preview: HTMLElement;
let mode: ViewMode;
let blocked: boolean;
let hasDocument: boolean;
let settings: ReturnType<typeof useSettingsStore>;

function key(target: HTMLElement = document.body, value = '+') {
  const event = new KeyboardEvent('keydown', { key: value, ctrlKey: true, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
}
function wheel(target: HTMLElement, deltaY: number) {
  const event = new WheelEvent('wheel', { ctrlKey: true, deltaY, bubbles: true, cancelable: true });
  // happy-dom 20 WheelEvent inherits UIEvent and drops MouseEvent modifier keys.
  Object.defineProperty(event, 'ctrlKey', { value: true });
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
}
beforeEach(() => {
  localStorage.clear();
  mode = 'split'; blocked = false; hasDocument = true;
  host = document.createElement('div');
  document.body.append(host);
  const pinia = createPinia();
  settings = useSettingsStore(pinia);
  app = createApp({
    setup() {
      const shell = ref<HTMLElement | null>(null);
      usePaneZoom(shell, () => mode, () => blocked, () => hasDocument);
      return { shell };
    },
    template: '<div ref="shell"><div data-document-pane="editor"><div class="cm-content" contenteditable="true"></div><button>Reset</button></div><div data-document-pane="preview" tabindex="0"></div><input /></div>',
  });
  app.use(pinia); app.mount(host);
  root = host.firstElementChild as HTMLDivElement;
  editor = root.querySelector('[data-document-pane="editor"]')!;
  preview = root.querySelector('[data-document-pane="preview"]')!;
});
afterEach(() => { app.unmount(); host.remove(); localStorage.clear(); });

describe('document pane zoom routing', () => {
  it('starts with editor then routes keys by pointer and focus', () => {
    key(); expect([settings.fontSize, settings.previewFontSize]).toEqual([15, 15]);
    preview.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    key(); expect([settings.fontSize, settings.previewFontSize]).toEqual([15, 16]);
    editor.dispatchEvent(new Event('focusin', { bubbles: true }));
    key(editor.querySelector<HTMLElement>('.cm-content')!);
    expect([settings.fontSize, settings.previewFontSize]).toEqual([16, 16]);
  });
  it('wheel targets its own pane without changing keyboard selection', () => {
    wheel(preview, -100); key();
    expect([settings.fontSize, settings.previewFontSize]).toEqual([15, 16]);
    wheel(editor, 100);
    expect([settings.fontSize, settings.previewFontSize]).toEqual([14, 16]);
  });
  it('uses visible pane in single mode even when the other was active', () => {
    preview.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    mode = 'edit'; key();
    mode = 'preview'; key();
    expect([settings.fontSize, settings.previewFontSize]).toEqual([15, 16]);
    key(document.body, '0');
    expect([settings.fontSize, settings.previewFontSize]).toEqual([15, 15]);
  });
  it('suppresses native zoom without resizing documents over dialogs and controls', () => {
    blocked = true; key(); wheel(editor, -1);
    blocked = false; key(root.querySelector('input')!); wheel(editor.querySelector('button')!, -1);
    hasDocument = false; key();
    expect([settings.fontSize, settings.previewFontSize]).toEqual([14, 15]);
  });
  it('clamps, ignores zero wheel delta and removes listeners on unmount', () => {
    settings.setPreviewFontSize(24); wheel(preview, -1); wheel(editor, 0);
    expect([settings.fontSize, settings.previewFontSize]).toEqual([14, 24]);
    app.unmount();
    const event = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
  });
});
