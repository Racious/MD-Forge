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
    expect(store.previewFontSize).toBe(15);
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

  it('migrates old editor size and supplies preview default independently', () => {
    localStorage.setItem('mdforge_settings', JSON.stringify({ fontSize: 19 }));
    const store = useSettingsStore();
    store.loadSettings();
    expect([store.fontSize, store.previewFontSize]).toEqual([19, 15]);
  });

  it('persists both sizes and resets each without changing the other', () => {
    const store = useSettingsStore();
    store.setFontSize(20);
    store.setPreviewFontSize(24);
    setActivePinia(createPinia());
    const restored = useSettingsStore();
    restored.loadSettings();
    expect([restored.fontSize, restored.previewFontSize]).toEqual([20, 24]);
    restored.resetFontSize();
    expect([restored.fontSize, restored.previewFontSize]).toEqual([14, 24]);
    restored.resetPreviewFontSize();
    expect([restored.fontSize, restored.previewFontSize]).toEqual([14, 15]);
  });

  it.each([[-9, 10], [99, 24], [18.7, 19], [null, 15], ['18', 15]])(
    'validates stored preview size %s', (stored, expected) => {
      localStorage.setItem('mdforge_settings', JSON.stringify({ fontSize: 99, previewFontSize: stored }));
      const store = useSettingsStore();
      store.loadSettings();
      expect(store.fontSize).toBe(24);
      expect(store.previewFontSize).toBe(expected);
      store.setPreviewFontSize(NaN);
      expect(store.previewFontSize).toBe(15);
    },
  );
});
