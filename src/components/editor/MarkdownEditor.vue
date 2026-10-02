<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput } from '@codemirror/language';
import { documentLanguage, documentTheme, documentFont } from '../../services/editorLanguageService';
import { detectLineEnding, normalizeEditorText } from '../../services/documentTextService';
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
const wrapCompartment = new Compartment();
const tabStates = new Map<string, EditorState>();
let displayedTabId: string | null = null;

function buildLanguageExtension() {
  return documentLanguage(editorStore.documentType);
}

function buildStaticExtensions() {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    indentOnInput(),
    highlightActiveLine(),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !updating) {
        const doc = editorStore.currentDocument;
        if (!doc) return;
        const ending = doc.lineEnding ?? detectLineEnding(doc.content);
        editorStore.setContent(update.state.doc.sliceString(0, update.state.doc.length, ending));
      }
    }),
  ];
}

function createEditorState(): EditorState {
  return EditorState.create({
    doc: editorStore.currentDocument?.content ?? '',
    extensions: [
      ...buildStaticExtensions(),
      themeCompartment.of(documentTheme(settingsStore.theme === 'dark', editorStore.documentType)),
      fontCompartment.of(documentFont(settingsStore.fontSize)),
      languageCompartment.of(buildLanguageExtension()),
      wrapCompartment.of(settingsStore.wordWrap ? EditorView.lineWrapping : []),
    ],
  });

}

function initEditor(): void {
  if (!containerRef.value) return;
  displayedTabId = editorStore.activeTabId;
  view = new EditorView({ state: createEditorState(), parent: containerRef.value });
}

function syncContent(newContent: string): void {
  if (!view) return;
  const current = view.state.doc.toString();
  if (current === normalizeEditorText(newContent)) return;
  updating = true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newContent },
  });
  updating = false;
}

watch(
  () => [editorStore.activeTabId, editorStore.currentDocument?.content] as const,
  ([id, val]) => {
    if (view && id !== displayedTabId) {
      if (displayedTabId) tabStates.set(displayedTabId, view.state);
      displayedTabId = id;
      view.setState(id && tabStates.get(id) || createEditorState());
      view.dispatch({ effects: [
        languageCompartment.reconfigure(buildLanguageExtension()),
        themeCompartment.reconfigure(documentTheme(settingsStore.theme === 'dark', editorStore.documentType)),
        fontCompartment.reconfigure(documentFont(settingsStore.fontSize)),
        wrapCompartment.reconfigure(settingsStore.wordWrap ? EditorView.lineWrapping : []),
      ] });
      const liveIds = new Set(editorStore.tabs.map(tab => tab.id));
      for (const cachedId of tabStates.keys()) if (!liveIds.has(cachedId)) tabStates.delete(cachedId);
    }
    if (val !== undefined) syncContent(val);
  }
);

watch(
  () => editorStore.documentType,
  () => {
    if (!view) return;
    view.dispatch({
      effects: [languageCompartment.reconfigure(buildLanguageExtension()),
        themeCompartment.reconfigure(documentTheme(settingsStore.theme === 'dark', editorStore.documentType))],
    });
  }
);

watch(
  () => settingsStore.theme,
  (val) => {
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(documentTheme(val === 'dark', editorStore.documentType)),
    });
  }
);

watch(
  () => settingsStore.fontSize,
  (val) => {
    if (!view) return;
    view.dispatch({
      effects: fontCompartment.reconfigure(documentFont(val)),
    });
  }
);

watch(() => settingsStore.wordWrap, val => {
  view?.dispatch({ effects: wrapCompartment.reconfigure(val ? EditorView.lineWrapping : []) });
});

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

onMounted(() => {
  initEditor();
});

onUnmounted(() => {
  view?.destroy();
});
</script>

<template>
  <div ref="containerRef" class="editor-container" />
</template>

<style scoped>
.editor-container {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.editor-container :deep(.cm-editor) {
  height: 100%;
}
</style>
