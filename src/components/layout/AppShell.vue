<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import EditorToolbar from '../editor/EditorToolbar.vue';
import TabBar from '../editor/TabBar.vue';
import Sidebar from './Sidebar.vue';
import FileStatusBar from '../files/FileStatusBar.vue';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import MarkdownPreview from '../editor/MarkdownPreview.vue';
import JsonTreeView from '../editor/JsonTreeView.vue';
import SettingsPage from '../../pages/SettingsPage.vue';
import CommandPalette from './CommandPalette.vue';
import { useEditorStore } from '../../stores/editorStore';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';

const editorStore = useEditorStore();
useKeyboardShortcuts();

const showSettings = ref(false);
const showPalette = ref(false);

function toggleSettings(): void {
  showSettings.value = !showSettings.value;
}

function openSettingsFromPalette(): void {
  showPalette.value = false;
  showSettings.value = true;
}

function handleKey(e: KeyboardEvent): void {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape' && showSettings.value) {
    showSettings.value = false;
    return;
  }
  // 命令面板：Ctrl+K，或 Ctrl+Shift+P（相容 VS Code 習慣）
  if (mod && (e.key.toLowerCase() === 'k' || (e.shiftKey && e.key.toLowerCase() === 'p'))) {
    e.preventDefault();
    showPalette.value = !showPalette.value;
    return;
  }
  if (mod && e.key === ',') {
    e.preventDefault();
    toggleSettings();
  }
}
onMounted(() => window.addEventListener('keydown', handleKey));
onUnmounted(() => window.removeEventListener('keydown', handleKey));

const showEditor = computed(() => editorStore.viewMode !== 'preview');
const showPreview = computed(() => editorStore.viewMode !== 'edit');
const hasDoc = computed(() => !!editorStore.currentDocument);
const isJsonDocument = computed(() => editorStore.documentType === 'json');
const showSidebar = computed(() => !hasDoc.value || editorStore.isMarkdownDocument);
</script>

<template>
  <div class="app-shell">
    <EditorToolbar :settings-open="showSettings" @toggle-settings="toggleSettings" />
    <TabBar />

    <div class="content-area">
      <Sidebar v-if="showSidebar" />

      <main class="editor-area">
        <template v-if="hasDoc">
          <div
            class="pane editor-pane"
            :class="{ 'pane-full': editorStore.viewMode === 'edit', 'pane-half': editorStore.viewMode === 'split' }"
            v-show="showEditor"
          >
            <MarkdownEditor />
          </div>

          <div class="pane-divider" v-if="editorStore.viewMode === 'split'" />

          <div
            class="pane preview-pane"
            :class="{ 'pane-full': editorStore.viewMode === 'preview', 'pane-half': editorStore.viewMode === 'split' }"
            v-show="showPreview"
          >
            <JsonTreeView v-if="isJsonDocument" />
            <MarkdownPreview v-else />
          </div>
        </template>

        <div v-else class="welcome-area">
          <slot name="welcome" />
        </div>
      </main>

      <CommandPalette
        v-if="showPalette"
        @close="showPalette = false"
        @open-settings="openSettingsFromPalette"
      />

      <Transition name="drawer">
        <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
          <aside class="settings-drawer">
            <div class="settings-drawer-header">
              <span class="settings-drawer-title">Settings</span>
              <button class="settings-close" title="Close (Esc)" @click="showSettings = false">×</button>
            </div>
            <div class="settings-drawer-body">
              <SettingsPage />
            </div>
          </aside>
        </div>
      </Transition>
    </div>

    <FileStatusBar />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}
.editor-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pane-full { flex: 1; }
.pane-half { flex: 1; }
.pane-divider {
  width: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}
.welcome-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
}
.settings-drawer {
  width: min(440px, 92%);
  height: 100%;
  background: var(--color-bg);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
}
.settings-drawer-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.settings-drawer-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.settings-drawer-body {
  flex: 1;
  overflow-y: auto;
}
.settings-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.settings-close:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

/* 滑入動畫：遮罩淡入，抽屜由右滑出 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .settings-drawer,
.drawer-leave-active .settings-drawer {
  transition: transform 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .settings-drawer,
.drawer-leave-to .settings-drawer {
  transform: translateX(100%);
}
</style>
