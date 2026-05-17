<script setup lang="ts">
import { computed, watch, nextTick, onMounted, ref } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';

const editorStore = useEditorStore();
const settingsStore = useSettingsStore();
const html = computed(() => editorStore.renderedHtml);
const previewRef = ref<HTMLDivElement | null>(null);

type MermaidType = typeof import('mermaid').default;
let mermaid: MermaidType | null = null;
let mermaidTheme = '';

async function initMermaid() {
  if (!mermaid) {
    const mod = await import('mermaid');
    mermaid = mod.default;
  }
  const theme = settingsStore.theme === 'dark' ? 'dark' : 'default';
  if (mermaidTheme === theme) return;
  mermaidTheme = theme;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });
}

async function renderMermaid() {
  if (!previewRef.value) return;
  const sources = previewRef.value.querySelectorAll<HTMLElement>('pre.mermaid-source');
  if (!sources.length) return;

  await initMermaid();

  for (const pre of sources) {
    const code = pre.textContent ?? '';
    if (!code.trim()) continue;

    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-block';
    pre.replaceWith(wrapper);

    try {
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await mermaid!.render(id, code);
      wrapper.innerHTML = svg;
    } catch {
      const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      wrapper.innerHTML = `<pre class="mermaid-error">${escaped}</pre>`;
    }
  }
}

watch(html, async () => {
  await nextTick();
  await renderMermaid();
});

watch(() => settingsStore.theme, async () => {
  if (!previewRef.value) return;
  mermaidTheme = '';
  await initMermaid();
  // Re-render: need full re-render since SVGs have baked-in colors
  // editorStore.renderPreview() will trigger html watch
  const { useEditorStore: useEditor } = await import('../../stores/editorStore');
  useEditor().renderPreview();
});

onMounted(async () => {
  await nextTick();
  await renderMermaid();
});
</script>

<template>
  <div class="preview-container">
    <div
      v-if="html"
      ref="previewRef"
      class="markdown-body"
      v-html="html"
    />
    <div v-else class="preview-empty">
      <p>Nothing to preview yet.</p>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  box-sizing: border-box;
}
.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>

<style>
.mermaid-block {
  margin: 16px 0;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}
.mermaid-block svg {
  max-width: 100%;
  height: auto;
}
.mermaid-error {
  background: var(--color-surface-hover);
  color: var(--color-danger);
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
