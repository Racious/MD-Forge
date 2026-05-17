<script setup lang="ts">
import { onMounted } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { useSettingsStore } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import { useEditorStore } from './stores/editorStore';
import { extractFileName } from './domain/file.types';
import AppShell from './components/layout/AppShell.vue';
import HomePage from './pages/HomePage.vue';

const settingsStore = useSettingsStore();
const fileStore = useFileStore();
const editorStore = useEditorStore();

onMounted(async () => {
  settingsStore.init();
  fileStore.loadRecentFiles();

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
  });
});
</script>

<template>
  <AppShell>
    <template #welcome>
      <HomePage />
    </template>
  </AppShell>
</template>