<script setup lang="ts">
import { onMounted } from 'vue';
import { useFileStore } from '../../stores/fileStore';
import { useUnsavedGuard } from '../../composables/useUnsavedGuard';

const fileStore = useFileStore();
const { guardedOpenFile } = useUnsavedGuard();

onMounted(() => fileStore.loadRecentFiles());

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

async function openRecent(path: string) {
  await guardedOpenFile(() => fileStore.openFileByPath(path));
}
</script>

<template>
  <div class="recent-list">
    <div class="recent-header">
      <span>Recent Files</span>
      <button v-if="fileStore.recentFiles.length" class="clear-btn" @click="fileStore.clearRecentFiles()">Clear</button>
    </div>
    <ul v-if="fileStore.recentFiles.length" class="file-items">
      <li
        v-for="file in fileStore.recentFiles"
        :key="file.path"
        class="file-item"
        :title="file.path"
        @click="openRecent(file.path)"
      >
        <span class="file-icon">📄</span>
        <span class="file-info">
          <span class="file-name">{{ file.fileName }}</span>
          <span class="file-date">{{ formatDate(file.lastOpenedAt) }}</span>
        </span>
        <button class="remove-btn" title="Remove from list" @click.stop="fileStore.removeRecentFile(file.path)">×</button>
      </li>
    </ul>
    <div v-else class="empty-recent">No recent files</div>
  </div>
</template>

<style scoped>
.recent-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border);
}
.clear-btn {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.clear-btn:hover { color: var(--color-danger); border-color: var(--color-danger); }
.file-items {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  flex: 1;
}
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 4px;
  transition: background 0.1s;
}
.file-item:hover { background: var(--color-surface-hover); }
.file-item:hover .remove-btn { opacity: 1; }
.file-icon { font-size: 14px; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; }
.file-name {
  display: block;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-date {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
}
.remove-btn {
  opacity: 0;
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0 2px;
  transition: color 0.1s, opacity 0.1s;
}
.remove-btn:hover { color: var(--color-danger); }
.empty-recent {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
