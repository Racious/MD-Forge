<script setup lang="ts">
import { onMounted } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';
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
  await editorStore.restoreSession();

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

  // 啟動更新檢查：安裝版優先走原生更新，失敗則改為引導攜帶版下載
  window.setTimeout(async () => {
    let handledByInstaller = false;
    try {
      const update = await check();
      if (update) {
        handledByInstaller = true;
        const yes = await ask(
          `MD Forge ${update.version} is available.\nDownload and install automatically?`,
          { title: 'Update Available', okLabel: 'Install', cancelLabel: 'Later' }
        );
        if (yes) {
          await update.downloadAndInstall();
          await relaunch();
        }
      }
    } catch {
      // 靜默略過（網路錯誤等）
    }

    // 安裝版未處理時，走攜帶版引導下載
    if (!handledByInstaller) {
      await notifyPortableReleaseUpdate();
    }
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
