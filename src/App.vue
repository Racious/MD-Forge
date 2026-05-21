<script setup lang="ts">
import { onMounted } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSettingsStore } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import { useEditorStore } from './stores/editorStore';
import { extractFileName } from './domain/file.types';
import { readFile } from './services/fileSystemService';
import { notifyPortableReleaseUpdate } from './services/releaseUpdateService';
import AppShell from './components/layout/AppShell.vue';
import HomePage from './pages/HomePage.vue';

const settingsStore = useSettingsStore();
const fileStore = useFileStore();
const editorStore = useEditorStore();

const MARKDOWN_EXTS = ['.md', '.markdown', '.mdx'];

function isMarkdownFile(path: string): boolean {
  return MARKDOWN_EXTS.some(ext => path.toLowerCase().endsWith(ext));
}

async function openFileByPath(path: string): Promise<void> {
  try {
    const content = await readFile(path);
    editorStore.openInTab({
      path,
      fileName: extractFileName(path),
      content,
      originalContent: content,
      isDirty: false,
      lastOpenedAt: new Date().toISOString(),
    });
    fileStore.loadRecentFiles();
  } catch (e) {
    console.error('Failed to open file:', e);
  }
}

onMounted(async () => {
  settingsStore.init();
  fileStore.loadRecentFiles();

  // 雙擊 / 命令列開檔
  await listen<[string, string]>('open-file', ({ payload }) => {
    const [path, content] = payload;
    editorStore.openInTab({
      path,
      fileName: extractFileName(path),
      content,
      originalContent: content,
      isDirty: false,
      lastOpenedAt: new Date().toISOString(),
    });
    fileStore.loadRecentFiles();
  });

  // 拖曳開檔
  await getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type === 'drop') {
      for (const path of event.payload.paths) {
        if (isMarkdownFile(path)) {
          openFileByPath(path);
        }
      }
    }
  });

  window.setTimeout(() => {
    notifyPortableReleaseUpdate();
  }, 5000);
});
</script>

<template>
  <AppShell>
    <template #welcome>
      <HomePage />
    </template>
  </AppShell>
</template>
