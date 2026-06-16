<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import ConfirmDialog from '../common/ConfirmDialog.vue';

const editorStore = useEditorStore();

const pendingCloseId = ref<string | null>(null);

const stripRef = ref<HTMLDivElement | null>(null);
const tabRefs = ref<Record<string, HTMLElement>>({});
const isOverflowing = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
let resizeObserver: ResizeObserver | null = null;

function setTabRef(id: string, el: Element | null): void {
  if (el) tabRefs.value[id] = el as HTMLElement;
  else delete tabRefs.value[id];
}

function updateScrollState(): void {
  const el = stripRef.value;
  if (!el) return;
  const maxScroll = el.scrollWidth - el.clientWidth;
  isOverflowing.value = maxScroll > 1;
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value = el.scrollLeft < maxScroll - 1;
}

function scrollByStep(direction: 1 | -1): void {
  const el = stripRef.value;
  if (!el) return;
  el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.6), behavior: 'smooth' });
}

function handleWheel(e: WheelEvent): void {
  const el = stripRef.value;
  if (!el || !isOverflowing.value) return;
  e.preventDefault();
  el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
}

function scrollActiveIntoView(): void {
  const id = editorStore.activeTabId;
  if (!id) return;
  const el = tabRefs.value[id];
  el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
}

watch(
  () => editorStore.activeTabId,
  async () => {
    await nextTick();
    scrollActiveIntoView();
    updateScrollState();
  }
);

watch(
  () => editorStore.tabs.length,
  async () => {
    await nextTick();
    updateScrollState();
  }
);

// 分頁列受 v-if 控制，元素可能在元件掛載後才出現；
// 以 watch 在 stripRef 真正存在時才掛 ResizeObserver。
watch(
  stripRef,
  (el) => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (el) {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(el);
      updateScrollState();
    }
  },
  { immediate: true }
);

function handleKeydown(e: KeyboardEvent): void {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  const tabs = editorStore.tabs;
  if (e.key.toLowerCase() === 'w') {
    if (!editorStore.activeTabId) return;
    e.preventDefault();
    requestClose(editorStore.activeTabId); // 沿用未儲存確認流程
  } else if (e.key === 'Tab' && tabs.length > 1) {
    e.preventDefault();
    const idx = tabs.findIndex(t => t.id === editorStore.activeTabId);
    const next = e.shiftKey
      ? (idx - 1 + tabs.length) % tabs.length
      : (idx + 1) % tabs.length;
    editorStore.switchTab(tabs[next].id);
  }
}

function handleCloseActiveTab(): void {
  if (editorStore.activeTabId) requestClose(editorStore.activeTabId);
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('mdforge:close-active-tab', handleCloseActiveTab);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mdforge:close-active-tab', handleCloseActiveTab);
});

function requestClose(id: string): void {
  const tab = editorStore.tabs.find(t => t.id === id);
  if (tab?.document.isDirty) {
    pendingCloseId.value = id;
  } else {
    editorStore.closeTab(id);
  }
}

function confirmClose(): void {
  if (pendingCloseId.value) {
    editorStore.closeTab(pendingCloseId.value);
    pendingCloseId.value = null;
  }
}

function cancelClose(): void {
  pendingCloseId.value = null;
}
</script>

<template>
  <div v-if="editorStore.tabs.length > 0" class="tab-bar">
    <button
      v-if="isOverflowing"
      class="tab-scroll-btn"
      title="Scroll tabs left"
      :disabled="!canScrollLeft"
      @click="scrollByStep(-1)"
    >‹</button>

    <div
      ref="stripRef"
      class="tab-strip"
      @wheel="handleWheel"
      @scroll="updateScrollState"
      @dblclick.self="editorStore.newDocument()"
    >
      <div
        v-for="tab in editorStore.tabs"
        :key="tab.id"
        :ref="el => setTabRef(tab.id, el as Element | null)"
        class="tab"
        :class="{ 'tab-active': tab.id === editorStore.activeTabId }"
        :title="tab.document.path ?? tab.document.fileName"
        @click="editorStore.switchTab(tab.id)"
        @mousedown.middle.prevent="requestClose(tab.id)"
      >
        <span class="tab-type" :class="`tab-type-${tab.document.type}`">{{ tab.document.type === 'json' ? '{}' : 'M' }}</span>
        <span class="tab-name">{{ tab.document.fileName }}</span>
        <span v-if="tab.document.isDirty" class="tab-dirty" title="Unsaved changes">●</span>
        <button
          class="tab-close"
          title="Close tab"
          @click.stop="requestClose(tab.id)"
        >×</button>
      </div>
    </div>

    <button
      v-if="isOverflowing"
      class="tab-scroll-btn"
      title="Scroll tabs right"
      :disabled="!canScrollRight"
      @click="scrollByStep(1)"
    >›</button>

    <button
      class="tab-new-btn"
      title="New tab (double-click empty area also works)"
      @click="editorStore.newDocument()"
    >+</button>
  </div>

  <ConfirmDialog
    v-if="pendingCloseId"
    :message="`&quot;${editorStore.tabs.find(t => t.id === pendingCloseId)?.document.fileName}&quot; has unsaved changes.\n\nDiscard changes and close?`"
    @confirm="confirmClose"
    @cancel="cancelClose"
  />
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.tab-strip {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.tab-strip::-webkit-scrollbar {
  display: none;
}
.tab-scroll-btn {
  flex: 0 0 auto;
  width: 26px;
  border: none;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  transition: background 0.1s, color 0.1s;
}
.tab-scroll-btn:last-child {
  border-right: none;
  border-left: 1px solid var(--color-border);
}
.tab-scroll-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.tab-scroll-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.tab-new-btn {
  flex: 0 0 auto;
  width: 30px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 15px;
  font-weight: 400;
  line-height: 1;
  padding: 0;
  opacity: 0.6;
  transition: opacity 0.12s, background 0.12s, color 0.12s;
}
.tab-new-btn:hover {
  opacity: 1;
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 34px;
  min-width: 0;
  max-width: 180px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-muted);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
  user-select: none;
}
.tab:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.tab-active {
  background: var(--color-bg);
  color: var(--color-text);
  border-bottom: 2px solid var(--color-accent);
}
.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.tab-type {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
}
.tab-type-json {
  color: var(--color-warning);
}
.tab-dirty {
  color: var(--color-warning);
  font-size: 10px;
  flex-shrink: 0;
}
.tab-close {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
}
.tab:hover .tab-close,
.tab-active .tab-close {
  opacity: 1;
}
.tab-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
</style>
