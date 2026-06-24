<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import ConfirmDialog from '../common/ConfirmDialog.vue';

const editorStore = useEditorStore();

const pendingCloseId = ref<string | null>(null);

// 拖拉重排（以 pointer 事件實作，避免與 Tauri 原生 drag-drop 攔截衝突）
// dragIndex = 被拖曳的分頁索引；dragOverIndex = 目前停留的目標索引
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
const dragOffsetX = ref(0);                 // 被拖分頁跟手的水平位移量（px）
let dragStartX = 0;
let draggedWidth = 0;                       // 被拖分頁的寬度，供其他分頁讓位位移量
const isDragging = ref(false);
let suppressClick = false;

// 讓位位移：被拖分頁從 dragIndex 移往 dragOverIndex 時，
// 介於兩者之間的分頁朝反方向讓開一個被拖分頁的寬度，空出落點缺口。
function tabShift(index: number): number {
  if (!isDragging.value || dragIndex.value === null || dragOverIndex.value === null) return 0;
  const from = dragIndex.value;
  const to = dragOverIndex.value;
  if (from < to && index > from && index <= to) return -draggedWidth; // 往右拖：右側分頁左讓
  if (from > to && index >= to && index < from) return draggedWidth;  // 往左拖：左側分頁右讓
  return 0;
}

// 拖曳開始時快照各分頁的「原始中點」。
// 落點計算只依這份快照，避免讓位動畫推動分頁後反過來干擾判斷而抖動。
let tabMidpoints: number[] = [];

function snapshotTabMidpoints(): void {
  tabMidpoints = editorStore.tabs.map(t => {
    const el = tabRefs.value[t.id];
    if (!el) return Infinity;
    const rect = el.getBoundingClientRect();
    return rect.left + rect.width / 2;
  });
}

// 依游標水平位置與原始中點快照，找出目前停留在哪個分頁索引
function computeTargetIndex(clientX: number): number {
  for (let i = 0; i < tabMidpoints.length; i++) {
    if (clientX < tabMidpoints[i]) return i;
  }
  return Math.max(0, tabMidpoints.length - 1);
}

function onTabMouseDown(index: number, id: string, e: MouseEvent): void {
  if (e.button === 1) {                                   // 中鍵關閉
    e.preventDefault();
    requestClose(id);
    return;
  }
  if (e.button !== 0) return;                             // 僅左鍵啟動拖曳
  if ((e.target as HTMLElement).closest('.tab-close')) return; // 關閉鈕不觸發拖曳
  suppressClick = false;                                  // 每次新互動先重置，避免旗標卡住誤吞下次點擊
  dragIndex.value = index;
  dragStartX = e.clientX;
  draggedWidth = tabRefs.value[id]?.offsetWidth ?? 0;     // 記錄被拖分頁寬度，供讓位位移
  isDragging.value = false;
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e: MouseEvent): void {
  if (dragIndex.value === null) return;
  if (!isDragging.value) {
    if (Math.abs(e.clientX - dragStartX) < 5) return;     // 位移門檻，區分點擊與拖曳
    isDragging.value = true;
    snapshotTabMidpoints();                               // 此刻尚未讓位，快照原始中點
  }
  dragOffsetX.value = e.clientX - dragStartX;             // 跟手位移
  dragOverIndex.value = computeTargetIndex(e.clientX);
}

function onDragEnd(): void {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  if (
    isDragging.value &&
    dragIndex.value !== null &&
    dragOverIndex.value !== null &&
    dragOverIndex.value !== dragIndex.value
  ) {
    editorStore.moveTab(dragIndex.value, dragOverIndex.value);
    suppressClick = true;                                 // 拖曳後緊接的 click 不再切換分頁
  }
  dragIndex.value = null;
  dragOverIndex.value = null;
  dragOffsetX.value = 0;
  isDragging.value = false;
}

function onTabClick(id: string): void {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  editorStore.switchTab(id);
}

// 取消拖曳（Esc）：還原位置、不重排，並吞掉隨後的 click 不切換
function cancelDrag(): void {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  dragIndex.value = null;
  dragOverIndex.value = null;
  dragOffsetX.value = 0;
  isDragging.value = false;
  suppressClick = true;
}

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
  if (e.key === 'Escape' && dragIndex.value !== null) {   // 拖曳中按 Esc 取消
    e.preventDefault();
    cancelDrag();
    return;
  }
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
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
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
      :class="{ 'is-dragging': isDragging }"
      @wheel="handleWheel"
      @scroll="updateScrollState"
      @dblclick.self="editorStore.newDocument()"
    >
      <div
        v-for="(tab, index) in editorStore.tabs"
        :key="tab.id"
        :ref="el => setTabRef(tab.id, el as Element | null)"
        class="tab"
        :class="{
          'tab-active': tab.id === editorStore.activeTabId,
          'tab-dragging': dragIndex === index,
          'tab-shifting': isDragging && dragIndex !== null && dragIndex !== index,
        }"
        :title="tab.document.path ?? tab.document.fileName"
        :style="dragIndex !== null
          ? { transform: `translateX(${dragIndex === index ? dragOffsetX : tabShift(index)}px)` }
          : undefined"
        @mousedown="onTabMouseDown(index, tab.id, $event)"
        @click="onTabClick(tab.id)"
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 34px;
  min-width: 0;
  max-width: 180px;
  cursor: grab;
  font-size: 12px;
  color: var(--color-text-muted);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
  user-select: none;
}
/* 拖曳進行中：整條分頁列顯示抓取游標 */
.tab-strip.is-dragging,
.tab-strip.is-dragging .tab {
  cursor: grabbing;
}
/* 拖曳中：被拖分頁跟手浮起（translateX 由 inline style 即時帶入，故此處不設過渡以免延遲） */
.tab-dragging {
  z-index: 5;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
  background: var(--color-bg);
  opacity: 0.95;
  transition: none;
}
/* 讓位中的鄰居分頁：平滑滑開，空出落點缺口 */
.tab-shifting {
  transition: transform 0.18s ease, background 0.1s, color 0.1s;
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
