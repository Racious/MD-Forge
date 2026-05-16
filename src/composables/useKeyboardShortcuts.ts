import { onMounted, onUnmounted } from 'vue';
import { useEditorStore } from '../stores/editorStore';
import { useFileStore } from '../stores/fileStore';

export function useKeyboardShortcuts() {
  const editorStore = useEditorStore();
  const fileStore = useFileStore();

  function handleKeydown(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    switch (e.key.toLowerCase()) {
      case 's':
        if (e.shiftKey) {
          e.preventDefault();
          editorStore.saveDocumentAs();
        } else {
          e.preventDefault();
          editorStore.saveDocument();
        }
        break;
      case 'o':
        e.preventDefault();
        fileStore.openFile();
        break;
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown));
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
}
