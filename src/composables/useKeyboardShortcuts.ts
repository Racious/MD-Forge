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
      case 'p':
        // 抑制 WebView 預設列印（Ctrl+P / Ctrl+Shift+P）；Ctrl+Shift+P 預留給未來命令面板
        e.preventDefault();
        break;
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown));
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
}
