import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ThemeMode, ViewMode } from '../domain/markdown.types';

const STORAGE_KEY = 'mdforge_settings';

interface SettingsData {
  theme: ThemeMode;
  viewMode: ViewMode;
  autoSave: boolean;
  wordWrap: boolean;
  fontSize: number;
}

const DEFAULTS: SettingsData = {
  theme: 'dark',
  viewMode: 'split',
  autoSave: false,
  wordWrap: true,
  fontSize: 14,
};

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeMode>(DEFAULTS.theme);
  const viewMode = ref<ViewMode>(DEFAULTS.viewMode);
  const autoSave = ref(DEFAULTS.autoSave);
  const wordWrap = ref(DEFAULTS.wordWrap);
  const fontSize = ref(DEFAULTS.fontSize);

  function loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<SettingsData>;
      theme.value = data.theme ?? DEFAULTS.theme;
      viewMode.value = data.viewMode ?? DEFAULTS.viewMode;
      autoSave.value = data.autoSave ?? DEFAULTS.autoSave;
      wordWrap.value = data.wordWrap ?? DEFAULTS.wordWrap;
      fontSize.value = data.fontSize ?? DEFAULTS.fontSize;
    } catch {
      // ignore malformed data
    }
  }

  function saveSettings(): void {
    const data: SettingsData = {
      theme: theme.value,
      viewMode: viewMode.value,
      autoSave: autoSave.value,
      wordWrap: wordWrap.value,
      fontSize: fontSize.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function setTheme(value: ThemeMode): void {
    theme.value = value;
    saveSettings();
    applyTheme(value);
  }

  function setFontSize(value: number): void {
    fontSize.value = Math.max(10, Math.min(24, value));
    saveSettings();
  }

  function toggleWordWrap(): void {
    wordWrap.value = !wordWrap.value;
    saveSettings();
  }

  function applyTheme(value: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', value);
  }

  function init(): void {
    loadSettings();
    applyTheme(theme.value);
  }

  return {
    theme,
    viewMode,
    autoSave,
    wordWrap,
    fontSize,
    loadSettings,
    saveSettings,
    setTheme,
    setFontSize,
    toggleWordWrap,
    init,
  };
});
