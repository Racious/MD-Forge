<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import JsonTreeNode from './JsonTreeNode.vue';

const editorStore = useEditorStore();

const DEFAULT_EXPAND_DEPTH = 2;

const parsed = computed<{ ok: true; value: unknown } | { ok: false; error: string }>(() => {
  const content = editorStore.currentDocument?.content ?? '';
  if (!content.trim()) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
});

const isEmpty = computed(() => parsed.value.ok && parsed.value.value === null);

// 展開／縮合控制：以遞增訊號 + 目標狀態通知所有節點
const signal = ref(0);
const expandAll = ref(true);
provide('jsonExpand', { signal, expandAll });

function expandAllNodes(): void {
  expandAll.value = true;
  signal.value++;
}
function collapseAllNodes(): void {
  expandAll.value = false;
  signal.value++;
}
</script>

<template>
  <div class="json-tree-container">
    <div v-if="!parsed.ok" class="json-error">
      <span class="json-error-title">JSON 格式錯誤</span>
      <span class="json-error-msg">{{ parsed.error }}</span>
    </div>

    <div v-else-if="isEmpty" class="json-empty">
      <p>沒有可顯示的 JSON 內容。</p>
    </div>

    <template v-else>
      <div class="json-toolbar">
        <button class="json-tool-btn" @click="expandAllNodes">全部展開</button>
        <button class="json-tool-btn" @click="collapseAllNodes">全部縮合</button>
      </div>
      <div class="json-tree-scroll">
        <JsonTreeNode
          :node-key="null"
          :value="parsed.value"
          :depth="0"
          :is-last="true"
          :default-expand-depth="DEFAULT_EXPAND_DEPTH"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.json-tree-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.json-toolbar {
  flex: 0 0 auto;
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
}
.json-tool-btn {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s;
}
.json-tool-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.json-tree-scroll {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
}
.json-error {
  margin: 16px;
  padding: 12px 16px;
  border: 1px solid var(--color-danger);
  border-radius: 6px;
  background: var(--color-surface-hover);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.json-error-title {
  color: var(--color-danger);
  font-weight: 600;
  font-size: 13px;
}
.json-error-msg {
  color: var(--color-text-muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  word-break: break-word;
}
.json-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
