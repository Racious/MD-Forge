<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import { useFileStore } from '../../stores/fileStore';
import { useTheme } from '../../composables/useTheme';
import { exportAsHtml } from '../../services/htmlExportService';

const editorStore = useEditorStore();
const fileStore = useFileStore();
const { theme, toggleTheme } = useTheme();

const emit = defineEmits<{ close: []; openSettings: [] }>();

interface Command {
  id: string;
  title: string;
  shortcut?: string;
  run: () => void;
}

function cycleTab(dir: 1 | -1): void {
  const tabs = editorStore.tabs;
  if (tabs.length < 2) return;
  const i = tabs.findIndex(t => t.id === editorStore.activeTabId);
  const n = (i + dir + tabs.length) % tabs.length;
  editorStore.switchTab(tabs[n].id);
}

const commands = computed<Command[]>(() => {
  const hasDoc = !!editorStore.currentDocument;
  const isMd = editorStore.isMarkdownDocument;
  const tabCount = editorStore.tabs.length;
  const list: Command[] = [];

  list.push({ id: 'open', title: '開啟檔案', shortcut: 'Ctrl+O', run: () => fileStore.openFile() });
  list.push({ id: 'new', title: '新增分頁', run: () => editorStore.newDocument() });

  if (hasDoc) {
    list.push({ id: 'save', title: '儲存', shortcut: 'Ctrl+S', run: () => editorStore.saveDocument() });
    list.push({ id: 'saveas', title: '另存新檔', shortcut: 'Ctrl+Shift+S', run: () => editorStore.saveDocumentAs() });
  }
  if (hasDoc && isMd) {
    const doc = editorStore.currentDocument!;
    list.push({ id: 'exporthtml', title: '匯出 HTML', run: () => void exportAsHtml(doc.fileName, doc.content) });
  }

  list.push({ id: 'view-edit', title: '檢視：僅編輯', run: () => editorStore.setViewMode('edit') });
  list.push({ id: 'view-split', title: '檢視：分割', run: () => editorStore.setViewMode('split') });
  list.push({ id: 'view-preview', title: '檢視：僅預覽', run: () => editorStore.setViewMode('preview') });

  if (tabCount > 1) {
    list.push({ id: 'next', title: '下一個分頁', shortcut: 'Ctrl+Tab', run: () => cycleTab(1) });
    list.push({ id: 'prev', title: '上一個分頁', shortcut: 'Ctrl+Shift+Tab', run: () => cycleTab(-1) });
  }
  if (tabCount > 0) {
    list.push({
      id: 'closetab',
      title: '關閉目前分頁',
      shortcut: 'Ctrl+W',
      run: () => window.dispatchEvent(new CustomEvent('mdforge:close-active-tab')),
    });
  }

  list.push({
    id: 'theme',
    title: `切換主題（目前：${theme.value === 'dark' ? '深色' : '淺色'}）`,
    run: () => toggleTheme(),
  });
  list.push({ id: 'settings', title: '開啟設定', shortcut: 'Ctrl+,', run: () => emit('openSettings') });

  return list;
});

const query = ref('');
const selected = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const filtered = computed<Command[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return commands.value;
  return commands.value.filter(c => c.title.toLowerCase().includes(q));
});

watch(filtered, () => { selected.value = 0; });

function execute(cmd: Command | undefined): void {
  if (!cmd) return;
  cmd.run();
  emit('close');
}

function move(delta: number): void {
  const len = filtered.value.length;
  if (!len) return;
  selected.value = (selected.value + delta + len) % len;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    move(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    move(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    execute(filtered.value[selected.value]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

onMounted(async () => {
  await nextTick();
  inputRef.value?.focus();
});
</script>

<template>
  <div class="palette-overlay" @click.self="emit('close')">
    <div class="palette">
      <input
        ref="inputRef"
        v-model="query"
        class="palette-input"
        type="text"
        placeholder="輸入指令…"
        @keydown="onKeydown"
      />
      <ul v-if="filtered.length" class="palette-list">
        <li
          v-for="(cmd, idx) in filtered"
          :key="cmd.id"
          class="palette-item"
          :class="{ active: idx === selected }"
          @click="execute(cmd)"
          @mousemove="selected = idx"
        >
          <span class="palette-title">{{ cmd.title }}</span>
          <span v-if="cmd.shortcut" class="palette-shortcut">{{ cmd.shortcut }}</span>
        </li>
      </ul>
      <div v-else class="palette-empty">查無相符指令</div>
    </div>
  </div>
</template>

<style scoped>
.palette-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}
.palette {
  width: min(560px, 90%);
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
}
.palette-input {
  flex: 0 0 auto;
  padding: 12px 16px;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
}
.palette-input::placeholder {
  color: var(--color-text-muted);
}
.palette-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 4px;
}
.palette-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text);
}
.palette-item.active {
  background: var(--color-accent);
  color: #fff;
}
.palette-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.palette-shortcut {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--color-text-muted);
}
.palette-item.active .palette-shortcut {
  color: rgba(255, 255, 255, 0.85);
}
.palette-empty {
  padding: 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
