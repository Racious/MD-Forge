<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput } from '@codemirror/language';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';

const editorStore = useEditorStore();
const settingsStore = useSettingsStore();

const containerRef = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;
let updating = false;

const themeCompartment = new Compartment();
const fontCompartment = new Compartment();
const languageCompartment = new Compartment();

function buildThemeExtension(dark: boolean) {
  return dark ? oneDark : [];
}

function buildFontExtension(size: number) {
  return EditorView.theme({
    '&': { fontSize: `${size}px`, height: '100%' },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
    },
  });
}

function buildLanguageExtension() {
  return editorStore.documentType === 'json' ? json() : markdown();
}

function buildStaticExtensions() {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    indentOnInput(),
    highlightActiveLine(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.lineWrapping,
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !updating) {
        editorStore.setContent(update.state.doc.toString());
      }
    }),
  ];
}

function initEditor(): void {
  if (!containerRef.value) return;

  const state = EditorState.create({
    doc: editorStore.currentDocument?.content ?? '',
    extensions: [
      ...buildStaticExtensions(),
      themeCompartment.of(buildThemeExtension(settingsStore.theme === 'dark')),
      fontCompartment.of(buildFontExtension(settingsStore.fontSize)),
      languageCompartment.of(buildLanguageExtension()),
    ],
  });

  view = new EditorView({ state, parent: containerRef.value });
}

function syncContent(newContent: string): void {
  if (!view) return;
  const current = view.state.doc.toString();
  if (current === newContent) return;
  updating = true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newContent },
  });
  updating = false;
}

watch(
  () => editorStore.currentDocument?.content,
  (val) => {
    if (val !== undefined) syncContent(val);
  }
);

watch(
  () => editorStore.documentType,
  () => {
    if (!view) return;
    view.dispatch({
      effects: languageCompartment.reconfigure(buildLanguageExtension()),
    });
  }
);

watch(
  () => settingsStore.theme,
  (val) => {
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(buildThemeExtension(val === 'dark')),
    });
  }
);

watch(
  () => settingsStore.fontSize,
  (val) => {
    if (!view) return;
    view.dispatch({
      effects: fontCompartment.reconfigure(buildFontExtension(val)),
    });
  }
);

watch(
  () => editorStore.pendingScrollLine,
  async (line) => {
    if (line === null || !view) return;
    await nextTick();
    const doc = view.state.doc;
    if (line < 1 || line > doc.lines) return;
    const pos = doc.line(line).from;
    const block = view.lineBlockAt(pos);
    view.scrollDOM.scrollTo({ top: block.top - 20, behavior: 'smooth' });
    editorStore.clearPendingScroll();
  }
);

function adjustFontSize(delta: number): void {
  settingsStore.setFontSize(settingsStore.fontSize + delta);
}

function handleWheel(e: WheelEvent): void {
  if (!e.ctrlKey) return;
  e.preventDefault();
  adjustFontSize(e.deltaY < 0 ? 1 : -1);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!e.ctrlKey) return;
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    adjustFontSize(1);
  } else if (e.key === '-') {
    e.preventDefault();
    adjustFontSize(-1);
  } else if (e.key === '0') {
    e.preventDefault();
    settingsStore.setFontSize(14);
  }
}

onMounted(() => {
  initEditor();
  containerRef.value?.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  view?.destroy();
  containerRef.value?.removeEventListener('wheel', handleWheel);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div ref="containerRef" class="editor-container" />
</template>

<style scoped>
.editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.editor-container :deep(.cm-editor) {
  height: 100%;
}
</style>
