import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import type { ViewMode } from '../domain/markdown.types';

export type DocumentPane = 'editor' | 'preview';

// CodeMirror's editable content is a document target; other inputs and controls are not.
function isControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('input, textarea, select, button, [role="dialog"], [data-zoom-exclude]')
    || !!target.closest('[contenteditable="true"]:not(.cm-content)');
}

function paneAt(target: EventTarget | null): DocumentPane | null {
  if (!(target instanceof Element)) return null;
  const pane = target.closest<HTMLElement>('[data-document-pane]')?.dataset.documentPane;
  return pane === 'editor' || pane === 'preview' ? pane : null;
}

export function usePaneZoom(
  root: Ref<HTMLElement | null>,
  mode: () => ViewMode,
  blocked: () => boolean,
  hasDocument: () => boolean,
) {
  const settings = useSettingsStore();
  const activePane = ref<DocumentPane>('editor');

  function activate(pane: DocumentPane): void { activePane.value = pane; }
  function change(pane: DocumentPane, delta: number | 'reset'): void {
    if (pane === 'editor') {
      if (delta === 'reset') settings.resetFontSize();
      else settings.setFontSize(settings.fontSize + delta);
    } else {
      if (delta === 'reset') settings.resetPreviewFontSize();
      else settings.setPreviewFontSize(settings.previewFontSize + delta);
    }
  }
  function handleActivate(event: Event): void {
    const pane = paneAt(event.target);
    if (pane && !blocked()) activate(pane);
  }
  function handleKey(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    const delta = event.key === '+' || event.key === '=' ? 1
      : event.key === '-' ? -1 : event.key === '0' ? 'reset' : null;
    if (delta === null) return;
    // Also suppress WebView-wide zoom when a dialog/control has the focus.
    event.preventDefault();
    if (blocked() || !hasDocument() || isControl(event.target)) return;
    if (event.target instanceof Node && event.target !== document.body
      && !root.value?.contains(event.target)) return;
    const pane = mode() === 'edit' ? 'editor' : mode() === 'preview' ? 'preview' : activePane.value;
    change(pane, delta);
  }
  function handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return;
    event.preventDefault();
    if (blocked() || !hasDocument() || isControl(event.target) || event.deltaY === 0) return;
    const pane = paneAt(event.target);
    if (pane && (mode() === 'split' || mode() === (pane === 'editor' ? 'edit' : 'preview'))) {
      change(pane, event.deltaY < 0 ? 1 : -1);
    }
  }
  onMounted(() => {
    root.value?.addEventListener('pointerdown', handleActivate);
    root.value?.addEventListener('focusin', handleActivate);
    window.addEventListener('keydown', handleKey, true);
    // Capture ctrl-wheel over controls too, preventing native whole-window zoom.
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
  });
  onUnmounted(() => {
    root.value?.removeEventListener('pointerdown', handleActivate);
    root.value?.removeEventListener('focusin', handleActivate);
    window.removeEventListener('keydown', handleKey, true);
    window.removeEventListener('wheel', handleWheel, true);
  });
  return { activePane, activate };
}
