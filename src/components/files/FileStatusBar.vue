<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editorStore';

const editorStore = useEditorStore();
const doc = computed(() => editorStore.currentDocument);
const isDirty = computed(() => editorStore.isDirty);
</script>

<template>
  <div class="status-bar">
    <span v-if="doc" class="status-path" :title="doc.path ?? 'Unsaved file'">
      {{ doc.path ?? 'New file' }}
    </span>
    <span v-else class="status-path muted">No file open</span>

    <div class="status-right">
      <span v-if="doc">
        <span class="status-badge" :class="isDirty ? 'unsaved' : 'saved'">
          {{ isDirty ? '● Unsaved' : '✓ Saved' }}
        </span>
        <span class="status-stat">{{ editorStore.wordCount }} words</span>
        <span class="status-stat">{{ editorStore.lineCount }} lines</span>
      </span>
      <span class="status-stat">{{ editorStore.viewMode }}</span>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 24px;
  font-size: 11px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  user-select: none;
}
.status-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 50%;
}
.muted { opacity: 0.5; }
.status-right { display: flex; align-items: center; gap: 12px; }
.status-badge { font-weight: 600; }
.status-badge.saved { color: var(--color-success); }
.status-badge.unsaved { color: var(--color-warning); }
.status-stat { color: var(--color-text-muted); }
</style>
