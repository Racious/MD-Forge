<script setup lang="ts">
import logoUrl from '../../src-tauri/icons/icon.png';
import { useFileStore } from '../stores/fileStore';
import { useEditorStore } from '../stores/editorStore';
import { useUnsavedGuard } from '../composables/useUnsavedGuard';

const fileStore = useFileStore();
const editorStore = useEditorStore();
const { guardedOpenFile } = useUnsavedGuard();

const version = __APP_VERSION__;
const buildTime = new Date(__BUILD_TIME__).toLocaleString('zh-TW', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
});

async function handleOpen() {
  await guardedOpenFile(() => fileStore.openFile());
}

function handleNew() {
  editorStore.newDocument();
}
</script>

<template>
  <div class="home-page">
    <div class="welcome-card">
      <img :src="logoUrl" class="logo" alt="MD Forge" />
      <h1 class="title">MD Forge</h1>
      <p class="subtitle">Local Markdown Editor · Offline · Fast</p>

      <div class="actions">
        <button class="btn-primary" @click="handleOpen">Open Markdown File</button>
        <button class="btn-secondary" @click="handleNew">New Document</button>
      </div>

      <div class="build-info">
        <span>v{{ version }}</span>
        <span class="build-sep">·</span>
        <span>Build {{ buildTime }}</span>
      </div>
    </div>

    <div v-if="fileStore.recentFiles.length" class="recent-section">
      <h2 class="section-title">Recent Files</h2>
      <ul class="recent-grid">
        <li
          v-for="file in fileStore.recentFiles.slice(0, 6)"
          :key="file.path"
          class="recent-card"
          :title="file.path"
          @click="fileStore.openFileByPath(file.path)"
        >
          <span class="card-icon">📄</span>
          <span class="card-name">{{ file.fileName }}</span>
          <span class="card-path">{{ file.path }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  gap: 48px;
  overflow-y: auto;
  width: 100%;
}
.welcome-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.logo { width: 80px; height: 80px; border-radius: 18px; }
.title {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
.subtitle { font-size: 14px; color: var(--color-text-muted); margin: 0; }
.build-info {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.6;
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}
.build-sep { opacity: 0.5; }
.actions { display: flex; gap: 12px; margin-top: 12px; }
.btn-primary, .btn-secondary {
  padding: 10px 24px;
  border-radius: 7px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary { background: var(--color-accent); border: none; color: #fff; font-weight: 600; }
.btn-primary:hover { opacity: 0.85; }
.btn-secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
.btn-secondary:hover { background: var(--color-surface-hover); }

.recent-section { width: 100%; max-width: 720px; }
.section-title { font-size: 16px; font-weight: 600; color: var(--color-text); margin: 0 0 16px; }
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.recent-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  background: var(--color-surface);
  transition: background 0.15s, border-color 0.15s;
  overflow: hidden;
}
.recent-card:hover { background: var(--color-surface-hover); border-color: var(--color-accent); }
.card-icon { font-size: 20px; }
.card-name { font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-path { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
