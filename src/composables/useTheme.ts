import { computed } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import type { ThemeMode } from '../domain/markdown.types';

export function useTheme() {
  const settingsStore = useSettingsStore();
  const theme = computed(() => settingsStore.theme);

  function toggleTheme(): void {
    const next: ThemeMode = theme.value === 'dark' ? 'light' : 'dark';
    settingsStore.setTheme(next);
  }

  return { theme, toggleTheme };
}
