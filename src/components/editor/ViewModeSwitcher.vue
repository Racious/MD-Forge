<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import type { ViewMode } from '../../domain/markdown.types';

const editorStore = useEditorStore();
const current = computed(() => editorStore.viewMode);

const modes: { value: ViewMode; label: string; title: string }[] = [
  { value: 'edit', label: 'Edit', title: 'Editor only' },
  { value: 'split', label: 'Split', title: 'Side by side' },
  { value: 'preview', label: 'Preview', title: 'Preview only' },
];
</script>

<template>
  <div class="mode-switcher">
    <button
      v-for="mode in modes"
      :key="mode.value"
      class="mode-btn"
      :class="{ active: current === mode.value }"
      :title="mode.title"
      @click="editorStore.setViewMode(mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>

<style scoped>
.mode-switcher {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}
.mode-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mode-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.mode-btn.active {
  background: var(--color-accent);
  color: #fff;
}
</style>
