import { afterEach, describe, expect, it } from 'vitest';
import { createApp, nextTick, type App } from 'vue';
import { createPinia } from 'pinia';
import TocPanel from '../components/editor/TocPanel.vue';
import { useEditorStore } from '../stores/editorStore';
import type { MarkdownDocument } from '../domain/markdown.types';

function markdownDocument(fileName: string, content: string): MarkdownDocument {
  return {
    path: `C:/fixtures/${fileName}`,
    fileName,
    type: 'markdown',
    content,
    originalContent: content,
    isDirty: false,
  };
}

describe('TocPanel', () => {
  let app: App<Element> | null = null;
  let root: HTMLDivElement | null = null;

  afterEach(() => {
    app?.unmount();
    root?.remove();
    localStorage.clear();
    app = null;
    root = null;
  });

  it('does not retain duplicate DOM entries while switching documents with repeated headings', async () => {
    const warnings: string[] = [];
    const pinia = createPinia();
    const editorStore = useEditorStore(pinia);
    root = document.createElement('div');
    document.body.appendChild(root);
    app = createApp(TocPanel);
    app.config.warnHandler = message => warnings.push(message);
    app.use(pinia);
    app.mount(root);

    editorStore.openDocument(markdownDocument('first.md', '# E\n# E\n# C'));
    editorStore.openDocument(markdownDocument(
      'second.md',
      '# C\n# C\n# C\n# D\n# D\n# B\n# C\n# E\n# B',
    ));
    await nextTick();

    const [firstTab, secondTab] = editorStore.tabs;
    for (let index = 0; index < 8; index += 1) {
      const target = index % 2 === 0 ? firstTab : secondTab;
      const expectedSlugs = target === firstTab
        ? ['e', 'e-1', 'c']
        : ['c', 'c-1', 'c-2', 'd', 'd-1', 'b', 'c-3', 'e', 'b-1'];
      editorStore.switchTab(target.id);
      await nextTick();

      expect(editorStore.toc.map(entry => entry.slug)).toEqual(expectedSlugs);
      expect(root.querySelectorAll('.toc-item')).toHaveLength(expectedSlugs.length);
      expect([...root.querySelectorAll<HTMLAnchorElement>('.toc-item')].map(link => link.hash)).toEqual(
        expectedSlugs.map(slug => `#${slug}`),
      );
    }

    expect(warnings.filter(message => message.includes('Duplicate keys'))).toEqual([]);
  });
});
