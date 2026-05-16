<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import { useFileStore } from '../../stores/fileStore';
import { useUnsavedGuard } from '../../composables/useUnsavedGuard';
import { useTheme } from '../../composables/useTheme';
import { exportAsHtml } from '../../services/htmlExportService';
import ViewModeSwitcher from './ViewModeSwitcher.vue';

const editorStore = useEditorStore();
const fileStore = useFileStore();
const { guardedOpenFile } = useUnsavedGuard();
const { theme, toggleTheme } = useTheme();

const hasDoc = computed(() => !!editorStore.currentDocument);
const isDirty = computed(() => editorStore.isDirty);

async function handleOpen() {
  await guardedOpenFile(() => fileStore.openFile());
}

async function handleExportHtml() {
  const doc = editorStore.currentDocument;
  if (!doc) return;
  await exportAsHtml(doc.fileName, doc.content);
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="app-name">MD Forge</span>
    </div>

    <div class="toolbar-center">
      <span v-if="hasDoc" class="file-name">
        {{ editorStore.fileName }}
        <span v-if="isDirty" class="dirty-dot" title="Unsaved changes">●</span>
      </span>
    </div>

    <div class="toolbar-right">
      <ViewModeSwitcher />
      <button class="toolbar-btn" title="Open file (Ctrl+O)" @click="handleOpen">Open</button>
      <button class="toolbar-btn" :disabled="!hasDoc" title="Save (Ctrl+S)" @click="editorStore.saveDocument()">Save</button>
      <button class="toolbar-btn" :disabled="!hasDoc" title="Save As (Ctrl+Shift+S)" @click="editorStore.saveDocumentAs()">Save As</button>
      <button class="toolbar-btn" :disabled="!hasDoc" title="Export HTML" @click="handleExportHtml">Export HTML</button>
      <button class="toolbar-btn icon-btn" :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`" @click="toggleTheme">
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 44px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  user-select: none;
}
.toolbar-left { flex: 0 0 auto; }
.toolbar-center { flex: 1; text-align: center; }
.toolbar-right { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }

.app-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--color-accent);
  letter-spacing: 0.5px;
}
.file-name {
  font-size: 13px;
  color: var(--color-text);
}
.dirty-dot {
  color: var(--color-warning);
  margin-left: 4px;
}
.toolbar-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s;
}
.toolbar-btn:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.icon-btn {
  font-size: 14px;
  padding: 4px 8px;
}
</style>
