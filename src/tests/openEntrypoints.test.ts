import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../App.vue';
import { useEditorStore } from '../stores/editorStore';
import { useFileStore } from '../stores/fileStore';
import { getDocumentType } from '../domain/file.types';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn(), drop: vi.fn(), check: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, convertFileSrc: (path: string) => path }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: mocks.drop }) }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }));
vi.mock('../components/layout/AppShell.vue', () => ({ default: { template: '<div />' } }));

let app: VueApp;
let root: HTMLElement;
let editor: ReturnType<typeof useEditorStore>;
let files: ReturnType<typeof useFileStore>;
let openEvent: (event: { payload: { requestId: number; path: string; content: string; source: string } }) => Promise<void>;
let dropEvent: (event: { payload: { type: string; paths: string[] } }) => void;
beforeEach(async () => {
  vi.useFakeTimers(); localStorage.clear(); vi.clearAllMocks();
  mocks.invoke.mockImplementation(async command => command === 'frontend_ready' ? 0 : '中文\r\n');
  mocks.listen.mockImplementation(async (_name, handler) => { openEvent = handler; return () => {}; });
  mocks.drop.mockImplementation(async handler => { dropEvent = handler; return () => {}; });
  const pinia = createPinia(); editor = useEditorStore(pinia); files = useFileStore(pinia);
  root = document.createElement('div'); document.body.append(root);
  app = createApp(App); app.use(pinia); app.mount(root);
  await nextTick();
  for (let count = 0; count < 8; count++) await Promise.resolve();
});
afterEach(() => { app.unmount(); root.remove(); vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });

describe('supported file entry points (mocked native transport)', () => {
  for (const extension of ['md', 'JSON', 'TXT', 'SQL', 'YAML', 'YML']) {
    it(`opens .${extension} from a native dialog`, async () => {
      mocks.invoke.mockResolvedValueOnce([`C:/文件.${extension}`, '中文\r\n']);
      await files.openFile();
      expect(editor.documentType).toBe(getDocumentType(`a.${extension}`));
      expect(editor.currentDocument?.content).toBe('中文\r\n');
    });
    it.each(['cold_start', 'second_instance'])(`opens .${extension} from %s and ACKs`, async source => {
      await openEvent({ payload: { requestId: 42, path: `C:/文件.${extension}`, content: '中文\r\n', source } });
      expect(editor.documentType).toBe(getDocumentType(`a.${extension}`));
      expect(mocks.invoke).toHaveBeenCalledWith('acknowledge_open_file', { requestId: 42, outcome: 'opened', detail: null });
      expect(editor.currentDocument?.lineEnding).toBe('\r\n');
    });
    it(`opens .${extension} from a drop`, async () => {
      dropEvent({ payload: { type: 'drop', paths: [`C:/文件.${extension}`] } });
      for (let count = 0; count < 8; count++) await Promise.resolve();
      await nextTick();
      expect(editor.documentType).toBe(getDocumentType(`a.${extension}`));
      expect(editor.currentDocument?.content).toBe('中文\r\n');
    });
  }
  it('ACKs unsupported events and ignores unsupported dropped files', async () => {
    await openEvent({ payload: { requestId: 9, path: 'C:/a.html', content: 'raw', source: 'cold_start' } });
    dropEvent({ payload: { type: 'drop', paths: ['C:/a.exe'] } });
    expect(editor.tabs).toHaveLength(0);
    expect(mocks.invoke).toHaveBeenCalledWith('acknowledge_open_file', { requestId: 9, outcome: 'unsupported', detail: null });
    expect(mocks.check).not.toHaveBeenCalled();
  });
});
