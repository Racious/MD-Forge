import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { MarkdownDocument, ViewMode } from '../domain/markdown.types';
import { renderMarkdown, extractToc, type TocEntry } from '../services/markdownRenderService';
import { saveFile, saveFileAs } from '../services/fileSystemService';
import { addRecentFile } from '../services/recentFileService';
import { extractFileName } from '../domain/file.types';

function resolveImageSrcs(html: string, docPath: string): string {
  const dir = docPath.replace(/[\\/][^\\/]+$/, '');
  return html.replace(/<img([^>]*?)\ssrc="([^"]+)"([^>]*?)>/gi, (_match, before, src, after) => {
    if (/^(https?:|data:|tauri:|asset:|blob:)/i.test(src)) return _match;
    const abs = src.startsWith('/') ? src : `${dir}/${src}`.replace(/\\/g, '/');
    return `<img${before} src="${convertFileSrc(abs)}"${after}>`;
  });
}

export const useEditorStore = defineStore('editor', () => {
  const currentDocument = ref<MarkdownDocument | null>(null);
  const renderedHtml = ref('');
  const toc = ref<TocEntry[]>([]);
  const viewMode = ref<ViewMode>('split');
  const isRendering = ref(false);

  const isDirty = computed(() => currentDocument.value?.isDirty ?? false);
  const fileName = computed(() => currentDocument.value?.fileName ?? '');
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
  }

  function openDocument(document: MarkdownDocument): void {
    currentDocument.value = { ...document };
    renderPreview();
    addRecentFile({
      path: document.path!,
      fileName: document.fileName,
      lastOpenedAt: new Date().toISOString(),
    });
  }

  function newDocument(): void {
    currentDocument.value = {
      path: null,
      fileName: 'untitled.md',
      content: '',
      originalContent: '',
      isDirty: false,
    };
    renderedHtml.value = '';
  }

  async function saveDocument(): Promise<void> {
    const doc = currentDocument.value;
    if (!doc) return;

    if (doc.path) {
      await saveFile(doc.path, doc.content);
      doc.originalContent = doc.content;
      doc.isDirty = false;
      doc.lastSavedAt = new Date().toISOString();
    } else {
      await saveDocumentAs();
    }
  }

  async function saveDocumentAs(): Promise<void> {
    const doc = currentDocument.value;
    if (!doc) return;

    const path = await saveFileAs(doc.content);
    if (path) {
      doc.path = path;
      doc.fileName = extractFileName(path);
      doc.originalContent = doc.content;
      doc.isDirty = false;
      doc.lastSavedAt = new Date().toISOString();
      addRecentFile({
        path,
        fileName: doc.fileName,
        lastOpenedAt: new Date().toISOString(),
      });
    }
  }

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode;
  }

  function renderPreview(): void {
    const doc = currentDocument.value;
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
    isDirty,
    fileName,
    wordCount,
    lineCount,
    setContent,
    openDocument,
    newDocument,
    saveDocument,
    saveDocumentAs,
    setViewMode,
    renderPreview,
    closeDocument,
  };
});
