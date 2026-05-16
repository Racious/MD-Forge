<script setup lang="ts">
import { useSettingsStore } from '../stores/settingsStore';
import { useTheme } from '../composables/useTheme';

const settings = useSettingsStore();
const { theme, toggleTheme } = useTheme();
</script>

<template>
  <div class="settings-page">
    <h2>Settings</h2>

    <div class="setting-row">
      <label>Theme</label>
      <button class="btn" @click="toggleTheme">{{ theme === 'dark' ? 'Dark' : 'Light' }}</button>
    </div>

    <div class="setting-row">
      <label>Font Size</label>
      <div class="number-ctrl">
        <button class="btn" @click="settings.setFontSize(settings.fontSize - 1)">−</button>
        <span>{{ settings.fontSize }}px</span>
        <button class="btn" @click="settings.setFontSize(settings.fontSize + 1)">+</button>
      </div>
    </div>

    <div class="setting-row">
      <label>Word Wrap</label>
      <button class="btn" @click="settings.toggleWordWrap()">{{ settings.wordWrap ? 'On' : 'Off' }}</button>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 32px;
  max-width: 480px;
}
h2 { margin: 0 0 24px; color: var(--color-text); }
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
.btn:hover { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.number-ctrl { display: flex; align-items: center; gap: 10px; }
</style>
