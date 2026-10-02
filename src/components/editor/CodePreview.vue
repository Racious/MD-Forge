<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { documentLanguage, documentTheme, documentFont } from '../../services/editorLanguageService';

const editor = useEditorStore();
const settings = useSettingsStore();
const root = ref<HTMLElement | null>(null);
const language = new Compartment();
const theme = new Compartment();
const font = new Compartment();
const wrap = new Compartment();
let view: EditorView | null = null;

function createState(): EditorState {
  return EditorState.create({
    doc: editor.currentDocument?.content ?? '',
    extensions: [
      EditorState.readOnly.of(true), EditorView.editable.of(false), lineNumbers(),
      EditorView.contentAttributes.of({ tabindex: '0', 'aria-label': 'Read-only document preview' }),
      language.of(documentLanguage(editor.documentType)),
      theme.of(documentTheme(settings.theme === 'dark', editor.documentType)),
      font.of(documentFont(settings.previewFontSize)),
      wrap.of(settings.wordWrap ? EditorView.lineWrapping : []),
    ],
  });
}

// No write-back listener: this view only renders text through CodeMirror's DOM.
watch(() => [editor.activeTabId, editor.currentDocument?.content, editor.documentType], () => {
  view?.setState(createState());
});
watch(() => settings.theme, value => {
  view?.dispatch({ effects: theme.reconfigure(documentTheme(value === 'dark', editor.documentType)) });
});
watch(() => settings.previewFontSize, value => {
  view?.dispatch({ effects: font.reconfigure(documentFont(value)) });
});
watch(() => settings.wordWrap, value => {
  view?.dispatch({ effects: wrap.reconfigure(value ? EditorView.lineWrapping : []) });
});
onMounted(() => { if (root.value) view = new EditorView({ state: createState(), parent: root.value }); });
onUnmounted(() => view?.destroy());
</script>

<template><div ref="root" class="code-preview" /></template>

<style scoped>
.code-preview { flex: 1; width: 100%; min-height: 0; overflow: hidden; }
.code-preview :deep(.cm-editor) { height: 100%; }
</style>
