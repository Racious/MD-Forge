<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import ConfirmDialog from '../common/ConfirmDialog.vue';

const editorStore = useEditorStore();

const pendingCloseId = ref<string | null>(null);

function requestClose(id: string): void {
  const tab = editorStore.tabs.find(t => t.id === id);
  if (tab?.document.isDirty) {
    pendingCloseId.value = id;
  } else {
    editorStore.closeTab(id);
  }
}

function confirmClose(): void {
  if (pendingCloseId.value) {
    editorStore.closeTab(pendingCloseId.value);
    pendingCloseId.value = null;
  }
}

function cancelClose(): void {
  pendingCloseId.value = null;
}
</script>

<template>
  <div v-if="editorStore.tabs.length > 0" class="tab-bar" @dblclick.self="editorStore.newDocument()">
    <div
      v-for="tab in editorStore.tabs"
      :key="tab.id"
      class="tab"
      :class="{ 'tab-active': tab.id === editorStore.activeTabId }"
      @click="editorStore.switchTab(tab.id)"
    >
      <span class="tab-type" :class="`tab-type-${tab.document.type}`">{{ tab.document.type === 'json' ? '{}' : 'M' }}</span>
      <span class="tab-name">{{ tab.document.fileName }}</span>
      <span v-if="tab.document.isDirty" class="tab-dirty" title="Unsaved changes">●</span>
      <button
        class="tab-close"
        title="Close tab"
        @click.stop="requestClose(tab.id)"
      >×</button>
    </div>
  </div>

  <ConfirmDialog
    v-if="pendingCloseId"
    :message="`&quot;${editorStore.tabs.find(t => t.id === pendingCloseId)?.document.fileName}&quot; has unsaved changes.\n\nDiscard changes and close?`"
    @confirm="confirmClose"
    @cancel="cancelClose"
  />
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.tab-bar::-webkit-scrollbar {
  display: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 34px;
  min-width: 0;
  max-width: 180px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-muted);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
  user-select: none;
}
.tab:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.tab-active {
  background: var(--color-bg);
  color: var(--color-text);
  border-bottom: 2px solid var(--color-accent);
}
.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.tab-type {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
}
.tab-type-json {
  color: var(--color-warning);
}
.tab-dirty {
  color: var(--color-warning);
  font-size: 10px;
  flex-shrink: 0;
}
.tab-close {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
}
.tab:hover .tab-close,
.tab-active .tab-close {
  opacity: 1;
}
.tab-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
</style>
