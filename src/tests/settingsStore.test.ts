import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '../stores/settingsStore';

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe('settingsStore', () => {
  it('loads default settings when nothing stored', () => {
    const store = useSettingsStore();
    store.loadSettings();
    expect(store.theme).toBe('dark');
    expect(store.wordWrap).toBe(true);
    expect(store.fontSize).toBe(14);
  });

  it('saves and reloads settings', () => {
    const store = useSettingsStore();
    store.setTheme('light');
    store.setFontSize(18);

    const store2 = useSettingsStore();
    store2.loadSettings();
    expect(store2.theme).toBe('light');
    expect(store2.fontSize).toBe(18);
  });

  it('clamps font size between 10 and 24', () => {
    const store = useSettingsStore();
    store.setFontSize(5);
    expect(store.fontSize).toBe(10);
    store.setFontSize(30);
    expect(store.fontSize).toBe(24);
  });

  it('toggles word wrap', () => {
    const store = useSettingsStore();
    const initial = store.wordWrap;
    store.toggleWordWrap();
    expect(store.wordWrap).toBe(!initial);
  });
});
