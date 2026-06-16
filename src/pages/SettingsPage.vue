<script setup lang="ts">
import { ref } from 'vue';
import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../stores/settingsStore';
import { useTheme } from '../composables/useTheme';
import { checkReleaseAndOpenDownload, openLatestReleasePage } from '../services/releaseUpdateService';

const settings = useSettingsStore();
const { theme, toggleTheme } = useTheme();

type UpdateState = 'idle' | 'checking' | 'downloading' | 'installing' | 'updated' | 'error';

const updateState = ref<UpdateState>('idle');
const updateMessage = ref('Check downloads for portable builds, or install automatically for installed builds.');
const downloadProgress = ref<number | null>(null);

function isBusy(): boolean {
  return updateState.value === 'checking' || updateState.value === 'downloading' || updateState.value === 'installing';
}

async function checkDownloadUpdate() {
  if (isBusy()) {
    return;
  }

  updateState.value = 'checking';
  updateMessage.value = 'Checking GitHub releases...';
  downloadProgress.value = null;

  try {
    updateMessage.value = await checkReleaseAndOpenDownload();
    updateState.value = 'idle';
  } catch (error) {
    updateState.value = 'error';
    updateMessage.value = error instanceof Error ? error.message : 'Failed to check GitHub releases.';
  }
}

async function installAppUpdate() {
  if (updateState.value === 'checking' || updateState.value === 'downloading' || updateState.value === 'installing') {
    return;
  }

  const shouldContinue = await confirm(
    'Automatic install is intended for installed versions of MD Forge. Portable users should use Check Downloads instead. Continue?',
    {
      title: 'Installed App Update',
      kind: 'warning',
      okLabel: 'Continue',
      cancelLabel: 'Cancel',
    },
  );

  if (!shouldContinue) {
    return;
  }

  updateState.value = 'checking';
  updateMessage.value = 'Checking installer update...';
  downloadProgress.value = null;

  try {
    const update = await check();

    if (!update) {
      updateState.value = 'idle';
      updateMessage.value = 'The installed app is up to date.';
      return;
    }

    const shouldInstall = await confirm(
      `MD Forge ${update.version} is available. Download and install it automatically?`,
      {
        title: 'Install Update',
        okLabel: 'Install',
        cancelLabel: 'Cancel',
      },
    );

    if (!shouldInstall) {
      updateState.value = 'idle';
      updateMessage.value = `Update ${update.version} is available.`;
      return;
    }

    let downloaded = 0;
    let contentLength = 0;

    updateState.value = 'downloading';
    updateMessage.value = `Downloading update ${update.version}...`;

    await update.downloadAndInstall((event: DownloadEvent) => {
      if (event.event === 'Started') {
        contentLength = event.data.contentLength ?? 0;
        downloaded = 0;
        downloadProgress.value = contentLength > 0 ? 0 : null;
      }

      if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        if (contentLength > 0) {
          downloadProgress.value = Math.min(100, Math.round((downloaded / contentLength) * 100));
        }
      }

      if (event.event === 'Finished') {
        updateState.value = 'installing';
        updateMessage.value = 'Installing update...';
        downloadProgress.value = 100;
      }
    });

    updateState.value = 'updated';
    updateMessage.value = 'Update installed. Restarting MD Forge...';
    await relaunch();
  } catch (error) {
    updateState.value = 'error';
    updateMessage.value = error instanceof Error ? error.message : 'Failed to check for updates.';
    downloadProgress.value = null;
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="setting-row">
      <label>Theme</label>
      <button class="btn" @click="toggleTheme">{{ theme === 'dark' ? 'Dark' : 'Light' }}</button>
    </div>

    <div class="setting-row">
      <label>Font Size</label>
      <div class="number-ctrl">
        <button class="btn" @click="settings.setFontSize(settings.fontSize - 1)">-</button>
        <span>{{ settings.fontSize }}px</span>
        <button class="btn" @click="settings.setFontSize(settings.fontSize + 1)">+</button>
      </div>
    </div>

    <div class="setting-row">
      <label>Word Wrap</label>
      <button class="btn" @click="settings.toggleWordWrap()">{{ settings.wordWrap ? 'On' : 'Off' }}</button>
    </div>

    <div class="setting-row">
      <label>JSON 存檔時自動格式化</label>
      <button class="btn" @click="settings.toggleFormatJsonOnSave()">{{ settings.formatJsonOnSave ? 'On' : 'Off' }}</button>
    </div>

    <div class="setting-row update-row">
      <div class="setting-copy">
        <label>App Update</label>
        <span>{{ updateMessage }}</span>
        <div v-if="downloadProgress !== null" class="progress-track" aria-label="Update download progress">
          <div class="progress-bar" :style="{ width: `${downloadProgress}%` }"></div>
        </div>
      </div>
      <div class="update-actions">
        <button
          class="btn"
          :disabled="isBusy()"
          @click="checkDownloadUpdate"
        >
          {{ updateState === 'checking' ? 'Checking' : 'Check Downloads' }}
        </button>
        <button
          class="btn secondary"
          :disabled="isBusy()"
          @click="installAppUpdate"
        >
          {{ updateState === 'downloading' ? 'Downloading' : updateState === 'installing' ? 'Installing' : 'Install Update' }}
        </button>
        <button class="btn secondary" @click="openLatestReleasePage">Releases</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 16px 20px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
  color: var(--color-text);
}

.btn {
  padding: 5px 14px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-hover);
  color: var(--color-text);
  cursor: pointer;
  font-size: 13px;
}

.btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.btn.secondary {
  background: transparent;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.btn:disabled:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border);
  color: var(--color-text);
}

.number-ctrl {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.setting-copy span {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.update-row {
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.update-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.progress-track {
  width: 100%;
  max-width: 220px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border);
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--color-accent);
  transition: width 160ms ease;
}
</style>
