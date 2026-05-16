<script setup lang="ts">
import { computed } from 'vue';
import RecentFileList from '../files/RecentFileList.vue';
import TocPanel from '../editor/TocPanel.vue';
import { useEditorStore } from '../../stores/editorStore';

const editorStore = useEditorStore();
const hasDocument = computed(() => !!editorStore.currentDocument);
</script>

<template>
  <aside class="sidebar">
    <TocPanel v-if="hasDocument" />
    <RecentFileList v-else />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}
</style>
