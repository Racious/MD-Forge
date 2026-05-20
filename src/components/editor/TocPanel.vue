<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import type { TocEntry } from '../../services/markdownRenderService';

const editorStore = useEditorStore();

const toc = computed<TocEntry[]>(() => editorStore.toc);

function scrollTo(entry: TocEntry): void {
  // 捲動預覽區至對應標題
  const el = document.getElementById(entry.slug);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // 同步捲動編輯器至對應行
  editorStore.scrollEditorToLine(entry.line);
}
</script>

<template>
  <div class="toc-panel">
    <div class="toc-header">Contents</div>
    <nav v-if="toc.length" class="toc-nav">
      <a
        v-for="entry in toc"
        :key="entry.slug + entry.text"
        class="toc-item"
        :class="`toc-h${entry.level}`"
        :href="`#${entry.slug}`"
        @click.prevent="scrollTo(entry)"
      >
        {{ entry.text }}
      </a>
    </nav>
    <div v-else class="toc-empty">No headings</div>
  </div>
</template>

<style scoped>
.toc-panel {
  display: flex;
  flex-direction: column;
}
.toc-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 12px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.toc-nav {
  display: flex;
  flex-direction: column;
  padding: 6px 0;
}
.toc-item {
  display: block;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;
  border-radius: 4px;
  margin: 0 4px;
  transition: background 0.1s, color 0.1s;
  line-height: 1.5;
}
.toc-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.toc-h1 { padding-left: 12px; font-weight: 600; color: var(--color-text); }
.toc-h2 { padding-left: 12px; }
.toc-h3 { padding-left: 22px; }
.toc-h4 { padding-left: 32px; font-size: 11px; }
.toc-h5 { padding-left: 40px; font-size: 11px; }
.toc-h6 { padding-left: 48px; font-size: 11px; }
.toc-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
