import { useEditorStore } from '../stores/editorStore';

export function useUnsavedGuard() {
  const editorStore = useEditorStore();

  function confirmDiscard(): boolean {
    if (!editorStore.isDirty) return true;
    return window.confirm(
      `"${editorStore.fileName}" has unsaved changes.\n\nDiscard changes and continue?`
    );
  }

  async function guardedOpenFile(action: () => Promise<void>): Promise<void> {
    if (confirmDiscard()) {
      await action();
    }
  }

  return { confirmDiscard, guardedOpenFile };
}
