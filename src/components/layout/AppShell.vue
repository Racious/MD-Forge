<script setup lang="ts">
import { computed } from 'vue';
import EditorToolbar from '../editor/EditorToolbar.vue';
import TabBar from '../editor/TabBar.vue';
import Sidebar from './Sidebar.vue';
import FileStatusBar from '../files/FileStatusBar.vue';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import MarkdownPreview from '../editor/MarkdownPreview.vue';
import { useEditorStore } from '../../stores/editorStore';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';

const editorStore = useEditorStore();
useKeyboardShortcuts();

const showEditor = computed(() => editorStore.viewMode !== 'preview');
const showPreview = computed(() => editorStore.viewMode !== 'edit');
const hasDoc = computed(() => !!editorStore.currentDocument);
</script>

<template>
  <div class="app-shell">
    <EditorToolbar />
    <TabBar />

    <div class="content-area">
      <Sidebar />

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
            <MarkdownPreview />
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
</style>
