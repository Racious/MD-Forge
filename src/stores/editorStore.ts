import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { DocumentType, MarkdownDocument, Tab, ViewMode } from '../domain/markdown.types';
import { renderMarkdown, extractToc, type TocEntry } from '../services/markdownRenderService';
import { readFile, saveFile, saveFileAs } from '../services/fileSystemService';
import { addRecentFile } from '../services/recentFileService';
import { extractFileName, getDocumentType } from '../domain/file.types';
import { useSettingsStore } from './settingsStore';

function resolveImageSrcs(html: string, docPath: string): string {
  const dir = docPath.replace(/[\\/][^\\/]+$/, '');
  return html.replace(/<img([^>]*?)\ssrc="([^"]+)"([^>]*?)>/gi, (_match, before, src, after) => {
    if (/^(https?:|data:|tauri:|asset:|blob:)/i.test(src)) return _match;
    const abs = src.startsWith('/') ? src : `${dir}/${src}`.replace(/\\/g, '/');
    return `<img${before} src="${convertFileSrc(abs)}"${after}>`;
  });
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

const SESSION_KEY = 'mdforge_session';

interface SessionTab {
  id: string;
  fileName: string;
  path: string | null;
  content: string;
  isDirty: boolean;
  originalContent: string;
  type?: DocumentType;
}

interface SessionData {
  tabs: SessionTab[];
  activeTabId: string | null;
}

export const useEditorStore = defineStore('editor', () => {
  const currentDocument = ref<MarkdownDocument | null>(null);
  const renderedHtml = ref('');
  const toc = ref<TocEntry[]>([]);
  const viewMode = ref<ViewMode>('split');
  const isRendering = ref(false);
  const pendingScrollLine = ref<number | null>(null);

  // Tab state
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<string | null>(null);

  const isDirty = computed(() => currentDocument.value?.isDirty ?? false);
  const fileName = computed(() => currentDocument.value?.fileName ?? '');
  const documentType = computed<DocumentType>(() => currentDocument.value?.type ?? 'markdown');
  const isMarkdownDocument = computed(() => documentType.value === 'markdown');
  const wordCount = computed(() => {
    const text = currentDocument.value?.content ?? '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  });
  const lineCount = computed(() => {
    const text = currentDocument.value?.content ?? '';
    return text ? text.split('\n').length : 0;
  });

  function setContent(content: string): void {
    if (!currentDocument.value) return;
    currentDocument.value.content = content;
    currentDocument.value.isDirty = content !== currentDocument.value.originalContent;
    renderPreview();
    saveSession();
  }

  // 格式化目前 JSON 文件；成功回傳 true，JSON 不合法回傳 false（不更動內容）
  function formatJsonDocument(): boolean {
    const doc = currentDocument.value;
    if (!doc || doc.type !== 'json') return false;
    try {
      const formatted = JSON.stringify(JSON.parse(doc.content), null, 2);
      if (formatted !== doc.content) setContent(formatted);
      return true;
    } catch {
      return false;
    }
  }

  // 存檔前：依設定自動格式化 JSON（不合法則原樣存檔）
  function maybeFormatOnSave(doc: MarkdownDocument): void {
    const settings = useSettingsStore();
    if (!settings.formatJsonOnSave || doc.type !== 'json') return;
    try {
      const formatted = JSON.stringify(JSON.parse(doc.content), null, 2);
      if (formatted !== doc.content) {
        doc.content = formatted;
        renderPreview();
      }
    } catch {
      // JSON 不合法，保留原內容存檔
    }
  }

  function openInTab(document: MarkdownDocument): void {
    // 同路徑已開啟則切換至該 tab
    if (document.path) {
      const existing = tabs.value.find(t => t.document.path === document.path);
      if (existing) {
        switchTab(existing.id);
        return;
      }
    }

    const id = generateId();
    const doc: MarkdownDocument = { ...document };
    const tab: Tab = { id, document: doc };
    tabs.value.push(tab);
    activeTabId.value = id;
    currentDocument.value = tab.document;
    renderPreview();

    if (document.path) {
      addRecentFile({
        path: document.path,
        fileName: document.fileName,
        lastOpenedAt: new Date().toISOString(),
      });
    }
    saveSession();
  }

  function openDocument(document: MarkdownDocument): void {
    openInTab(document);
  }

  function switchTab(id: string): void {
    const tab = tabs.value.find(t => t.id === id);
    if (!tab) return;
    activeTabId.value = id;
    currentDocument.value = tab.document;
    renderPreview();
  }

  function closeTab(id: string): void {
    const tabIndex = tabs.value.findIndex(t => t.id === id);
    if (tabIndex === -1) return;

    tabs.value.splice(tabIndex, 1);

    if (activeTabId.value === id) {
      if (tabs.value.length > 0) {
        const newIndex = Math.min(tabIndex, tabs.value.length - 1);
        switchTab(tabs.value[newIndex].id);
      } else {
        activeTabId.value = null;
        currentDocument.value = null;
        renderedHtml.value = '';
        toc.value = [];
      }
    }
    saveSession();
  }

  // 將分頁從 fromIndex 移動到 toIndex（拖拉重排用）；順序一併持久化
  function moveTab(fromIndex: number, toIndex: number): void {
    const len = tabs.value.length;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 || fromIndex >= len ||
      toIndex < 0 || toIndex >= len
    ) return;
    const [moved] = tabs.value.splice(fromIndex, 1);
    tabs.value.splice(toIndex, 0, moved);
    saveSession();
  }

  function newDocument(): void {
    const doc: MarkdownDocument = {
      path: null,
      fileName: 'untitled.md',
      type: 'markdown',
      content: '',
      originalContent: '',
      isDirty: false,
    };
    const id = generateId();
    const tab: Tab = { id, document: doc };
    tabs.value.push(tab);
    activeTabId.value = id;
    currentDocument.value = tab.document;
    renderedHtml.value = '';
    toc.value = [];
    saveSession();
  }

  async function saveDocument(): Promise<void> {
    const doc = currentDocument.value;
    if (!doc) return;

    maybeFormatOnSave(doc);

    if (doc.path) {
      await saveFile(doc.path, doc.content);
      doc.originalContent = doc.content;
      doc.isDirty = false;
      doc.lastSavedAt = new Date().toISOString();
      saveSession();
    } else {
      await saveDocumentAs();
    }
  }

  async function saveDocumentAs(): Promise<void> {
    const doc = currentDocument.value;
    if (!doc) return;

    maybeFormatOnSave(doc);

    const path = await saveFileAs(doc.content, doc.type);
    if (path) {
      doc.path = path;
      doc.fileName = extractFileName(path);
      doc.type = getDocumentType(path);
      doc.originalContent = doc.content;
      doc.isDirty = false;
      doc.lastSavedAt = new Date().toISOString();
      addRecentFile({
        path,
        fileName: doc.fileName,
        lastOpenedAt: new Date().toISOString(),
      });
      saveSession();
    }
  }

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode;
  }

  function saveSession(): void {
    const session: SessionData = {
      tabs: tabs.value.map(t => ({
        id: t.id,
        fileName: t.document.fileName,
        path: t.document.path,
        content: t.document.content,
        isDirty: t.document.isDirty,
        originalContent: t.document.originalContent,
        type: t.document.type,
      })),
      activeTabId: activeTabId.value,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // localStorage 滿了就略過
    }
  }

  async function restoreSession(): Promise<boolean> {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw) as SessionData;
      if (!session.tabs?.length) return false;

      for (const tabData of session.tabs) {
        let content = tabData.content;
        let originalContent = tabData.originalContent;

        if (tabData.path) {
          try {
            const diskContent = await readFile(tabData.path);
            originalContent = diskContent;
            content = tabData.isDirty ? tabData.content : diskContent;
          } catch {
            // 檔案已移除，用 session 內容
          }
        }

        const doc: MarkdownDocument = {
          path: tabData.path,
          fileName: tabData.fileName,
          type: tabData.type ?? getDocumentType(tabData.path ?? tabData.fileName),
          content,
          originalContent,
          isDirty: tabData.isDirty,
        };

        const tab: Tab = { id: tabData.id, document: doc };
        tabs.value.push(tab);
      }

      const activeId = session.activeTabId ?? session.tabs[0]?.id ?? null;
      if (activeId && tabs.value.find(t => t.id === activeId)) {
        switchTab(activeId);
      } else if (tabs.value.length > 0) {
        switchTab(tabs.value[0].id);
      }

      return true;
    } catch {
      return false;
    }
  }

  function scrollEditorToLine(line: number): void {
    pendingScrollLine.value = line;
  }

  function clearPendingScroll(): void {
    pendingScrollLine.value = null;
  }

  function renderPreview(): void {
    const doc = currentDocument.value;
    if (doc?.type === 'json') {
      renderedHtml.value = '';
      toc.value = [];
      isRendering.value = false;
      return;
    }
    const content = doc?.content ?? '';
    isRendering.value = true;
    let html = renderMarkdown(content);
    if (doc?.path) html = resolveImageSrcs(html, doc.path);
    renderedHtml.value = html;
    toc.value = extractToc(content);
    isRendering.value = false;
  }

  async function closeDocument(): Promise<boolean> {
    if (isDirty.value) {
      return false;
    }
    currentDocument.value = null;
    renderedHtml.value = '';
    toc.value = [];
    return true;
  }

  return {
    currentDocument,
    renderedHtml,
    toc,
    viewMode,
    isRendering,
    pendingScrollLine,
    tabs,
    activeTabId,
    isDirty,
    fileName,
    documentType,
    isMarkdownDocument,
    wordCount,
    lineCount,
    setContent,
    formatJsonDocument,
    openDocument,
    openInTab,
    switchTab,
    closeTab,
    moveTab,
    newDocument,
    saveDocument,
    saveDocumentAs,
    setViewMode,
    renderPreview,
    closeDocument,
    scrollEditorToLine,
    clearPendingScroll,
    saveSession,
    restoreSession,
  };
});
