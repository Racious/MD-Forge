<script setup lang="ts">
import { computed, ref } from 'vue';
import EditorToolbar from '../editor/EditorToolbar.vue';
import TabBar from '../editor/TabBar.vue';
import Sidebar from './Sidebar.vue';
import FileStatusBar from '../files/FileStatusBar.vue';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import MarkdownPreview from '../editor/MarkdownPreview.vue';
import JsonTreeView from '../editor/JsonTreeView.vue';
import SettingsPage from '../../pages/SettingsPage.vue';
import { useEditorStore } from '../../stores/editorStore';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';

const editorStore = useEditorStore();
useKeyboardShortcuts();

const showSettings = ref(false);
const showEditor = computed(() => editorStore.viewMode !== 'preview');
const showPreview = computed(() => editorStore.viewMode !== 'edit');
const hasDoc = computed(() => !!editorStore.currentDocument);
const isJsonDocument = computed(() => editorStore.documentType === 'json');
const showSidebar = computed(() => !hasDoc.value || editorStore.isMarkdownDocument);
</script>

<template>
  <div class="app-shell">
    <EditorToolbar @open-settings="showSettings = true" />
    <TabBar />

    <div class="content-area">
      <Sidebar v-if="!showSettings && showSidebar" />

      <main class="editor-area">
        <div v-if="showSettings" class="settings-area">
          <div class="settings-header">
            <button class="settings-close" @click="showSettings = false">Close</button>
          </div>
          <SettingsPage />
        </div>

        <template v-else-if="hasDoc">
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
.settings-area {
  flex: 1;
  overflow-y: auto;
}
.settings-header {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px 0;
}
.settings-close {
  padding: 5px 14px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  cursor: pointer;
  font-size: 13px;
}
.settings-close:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
</style>
