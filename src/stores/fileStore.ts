import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RecentFile } from '../domain/markdown.types';
import {
  getRecentFiles,
  addRecentFile as persistAdd,
  removeRecentFile as persistRemove,
  clearRecentFiles as persistClear,
} from '../services/recentFileService';
import { openSupportedFile } from '../services/fileSystemService';
import { useEditorStore } from './editorStore';

export const useFileStore = defineStore('file', () => {
  const recentFiles = ref<RecentFile[]>([]);

  function loadRecentFiles(): void {
    recentFiles.value = getRecentFiles();
  }

  function addRecentFile(file: RecentFile): void {
    persistAdd(file);
    loadRecentFiles();
  }

  function removeRecentFile(path: string): void {
    persistRemove(path);
    loadRecentFiles();
  }

  function clearRecentFiles(): void {
    persistClear();
    recentFiles.value = [];
  }

  async function openFile(): Promise<void> {
    const editorStore = useEditorStore();
    const document = await openSupportedFile();
    if (document) {
      editorStore.openInTab(document);
      loadRecentFiles();
    }
  }

  async function openFileByPath(path: string): Promise<void> {
    const editorStore = useEditorStore();
    const { readFile } = await import('../services/fileSystemService');
    const { extractFileName, getDocumentType } = await import('../domain/file.types');
    try {
      const content = await readFile(path);
      editorStore.openInTab({
        path,
        fileName: extractFileName(path),
        type: getDocumentType(path),
        content,
        originalContent: content,
        isDirty: false,
        lastOpenedAt: new Date().toISOString(),
      });
      loadRecentFiles();
    } catch (e) {
      removeRecentFile(path);
      throw e;
    }
  }

  return {
    recentFiles,
    loadRecentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    openFile,
    openFileByPath,
  };
});
