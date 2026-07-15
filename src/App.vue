<script setup lang="ts">
import { onMounted } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import { useEditorStore } from './stores/editorStore';
import { extractFileName, getDocumentType, isSupportedFile } from './domain/file.types';
import { readFile } from './services/fileSystemService';
import { notifyPortableReleaseUpdate } from './services/releaseUpdateService';
import { executeOpenFileAction, type OpenFileOutcome } from './services/openFileRequestService';
import AppShell from './components/layout/AppShell.vue';
import HomePage from './pages/HomePage.vue';
import { useToast } from './composables/useToast';

const settingsStore = useSettingsStore();
const fileStore = useFileStore();
const editorStore = useEditorStore();

// 全域 toast 反饋（複製等動作）；解構成頂層變數讓模板自動解包 ref
const { message: toastMessage } = useToast();

async function openFileByPath(path: string): Promise<void> {
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
    fileStore.loadRecentFiles();
  } catch (e) {
    console.error('Failed to open file:', e);
  }
}

interface OpenFilePayload {
  requestId: number;
  path: string;
  content: string;
  source: 'cold_start' | 'second_instance';
}

async function acknowledgeOpenFile(
  requestId: number,
  outcome: OpenFileOutcome,
  detail?: string
): Promise<void> {
  try {
    await invoke('acknowledge_open_file', { requestId, outcome, detail: detail ?? null });
  } catch (error) {
    console.error('Failed to acknowledge open-file request:', error);
  }
}

onMounted(async () => {
  settingsStore.init();
  fileStore.loadRecentFiles();

  // 先註冊監聽，再還原工作階段；Rust 會在 frontend_ready 前保留所有開檔請求。
  await listen<OpenFilePayload>('open-file', async ({ payload }) => {
    const { requestId, path, content } = payload;
    if (!isSupportedFile(path)) {
      await acknowledgeOpenFile(requestId, 'unsupported');
      return;
    }
    await executeOpenFileAction(
      requestId,
      () => {
        editorStore.openInTab({
          path,
          fileName: extractFileName(path),
          type: getDocumentType(path),
          content,
          originalContent: content,
          isDirty: false,
          lastOpenedAt: new Date().toISOString(),
        });
        fileStore.loadRecentFiles();
      },
      acknowledgeOpenFile,
      error => console.error('Failed to handle open-file request:', error)
    );
  });

  await editorStore.restoreSession();
  await invoke<number>('frontend_ready');

  // 拖曳開檔
  await getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type === 'drop') {
      for (const path of event.payload.paths) {
        if (isSupportedFile(path)) {
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

  <!-- 全域 toast 反饋 -->
  <Transition name="toast">
    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  max-width: 360px;
  background: var(--color-surface);
  border: 1px solid var(--color-accent);
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 100;
  pointer-events: none;
}
.toast::before {
  content: '✓ ';
  color: var(--color-success);
  font-weight: 700;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px) scale(0.96);
}
</style>
