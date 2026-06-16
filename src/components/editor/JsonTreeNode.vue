<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import { copyWithToast } from '../../composables/useToast';

interface ExpandController {
  signal: { value: number };
  expandAll: { value: boolean };
}

const props = defineProps<{
  nodeKey: string | number | null;
  value: unknown;
  depth: number;
  isLast: boolean;
  defaultExpandDepth: number;
  path: string;
}>();

const controller = inject<ExpandController | null>('jsonExpand', null);

const valueType = computed(() => {
  const v = props.value;
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // object | string | number | boolean
});

const isExpandable = computed(
  () => valueType.value === 'object' || valueType.value === 'array'
);

const entries = computed<[string | number, unknown][]>(() => {
  if (valueType.value === 'array') {
    return (props.value as unknown[]).map((v, i) => [i, v]);
  }
  if (valueType.value === 'object') {
    return Object.entries(props.value as Record<string, unknown>);
  }
  return [];
});

const childCount = computed(() => entries.value.length);

const expanded = ref(isExpandable.value && props.depth < props.defaultExpandDepth);

if (controller) {
  watch(
    () => controller.signal.value,
    () => {
      if (isExpandable.value) expanded.value = controller.expandAll.value;
    }
  );
}

function toggle(): void {
  if (isExpandable.value) expanded.value = !expanded.value;
}

const bracket = computed(() => (valueType.value === 'array' ? ['[', ']'] : ['{', '}']));

const displayValue = computed(() => {
  switch (valueType.value) {
    case 'string':
      return `"${props.value as string}"`;
    case 'null':
      return 'null';
    default:
      return String(props.value);
  }
});

const summary = computed(() =>
  valueType.value === 'array'
    ? `${childCount.value} 項`
    : `${childCount.value} 個鍵`
);

function childPath(key: string | number): string {
  if (valueType.value === 'array') return `${props.path}[${key}]`;
  const k = String(key);
  return /^[A-Za-z_$][\w$]*$/.test(k) ? `${props.path}.${k}` : `${props.path}[${JSON.stringify(k)}]`;
}

function copyValue(): void {
  const v = props.value;
  const text =
    v !== null && typeof v === 'object'
      ? JSON.stringify(v, null, 2)
      : v === null
        ? 'null'
        : String(v);
  copyWithToast(text, isExpandable.value ? '已複製 JSON' : '已複製值');
}

function copyPath(): void {
  copyWithToast(props.path, '已複製路徑');
}
</script>

<template>
  <div class="json-node">
    <div class="json-row" :class="{ clickable: isExpandable }" @click="toggle">
      <span class="json-toggle">
        <span v-if="isExpandable" class="json-arrow" :class="{ open: expanded }">▶</span>
        <span v-else class="json-arrow-placeholder" />
      </span>

      <span v-if="nodeKey !== null" class="json-key">{{ nodeKey }}</span>
      <span v-if="nodeKey !== null" class="json-colon">:</span>

      <template v-if="isExpandable">
        <span class="json-bracket">{{ bracket[0] }}</span>
        <span v-if="!expanded" class="json-summary">{{ summary }}</span>
        <span v-if="!expanded" class="json-bracket">{{ bracket[1] }}</span>
        <span v-if="!expanded && !isLast" class="json-comma">,</span>
      </template>

      <template v-else>
        <span class="json-value" :class="`type-${valueType}`">{{ displayValue }}</span>
        <span v-if="!isLast" class="json-comma">,</span>
      </template>

      <span class="json-actions">
        <button
          class="json-copybtn"
          :title="isExpandable ? '複製此節點 JSON' : '複製值'"
          @click.stop="copyValue"
        >{{ isExpandable ? '{ }' : '值' }}</button>
        <button
          v-if="depth > 0"
          class="json-copybtn"
          title="複製路徑"
          @click.stop="copyPath"
        >⧉</button>
      </span>
    </div>

    <div v-if="isExpandable && expanded" class="json-children">
      <JsonTreeNode
        v-for="([childKey, childValue], idx) in entries"
        :key="String(childKey)"
        :node-key="valueType === 'array' ? null : (childKey as string)"
        :value="childValue"
        :depth="depth + 1"
        :is-last="idx === entries.length - 1"
        :default-expand-depth="defaultExpandDepth"
        :path="childPath(childKey)"
      />
      <div class="json-row closing">
        <span class="json-toggle"><span class="json-arrow-placeholder" /></span>
        <span class="json-bracket">{{ bracket[1] }}</span>
        <span v-if="!isLast" class="json-comma">,</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-node {
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
}
.json-row {
  display: flex;
  align-items: baseline;
  white-space: pre;
  border-radius: 3px;
}
.json-row.clickable {
  cursor: pointer;
}
.json-row.clickable:hover {
  background: var(--color-surface-hover);
}
.json-toggle {
  flex: 0 0 auto;
  width: 16px;
  display: inline-flex;
  justify-content: center;
}
.json-arrow {
  font-size: 9px;
  color: var(--color-text-muted);
  transition: transform 0.12s ease;
  display: inline-block;
}
.json-arrow.open {
  transform: rotate(90deg);
}
.json-arrow-placeholder {
  display: inline-block;
  width: 9px;
}
.json-key {
  color: var(--color-accent);
}
.json-colon {
  color: var(--color-text-muted);
  margin-right: 6px;
}
.json-bracket {
  color: var(--color-text-muted);
}
.json-summary {
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0 6px;
  opacity: 0.7;
}
.json-comma {
  color: var(--color-text-muted);
}
.json-children {
  padding-left: 16px;
  border-left: 1px dashed var(--color-border);
  margin-left: 7px;
}
.json-value.type-string {
  color: var(--color-success);
}
.json-value.type-number {
  color: var(--color-accent);
}
.json-value.type-boolean {
  color: var(--color-warning);
}
.json-value.type-null {
  color: var(--color-danger);
  font-style: italic;
}
.json-row.closing {
  cursor: default;
}
.json-actions {
  display: inline-flex;
  gap: 4px;
  margin-left: 8px;
}
.json-copybtn {
  opacity: 0;
  padding: 0 6px;
  font-size: 11px;
  line-height: 1.5;
  border: 1px solid transparent;
  background: none;
  color: var(--color-text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.12s, background 0.12s, color 0.12s;
}
.json-row:hover .json-copybtn {
  opacity: 1;
}
.json-copybtn:hover {
  color: var(--color-accent);
  border-color: var(--color-border);
  background: var(--color-surface-hover);
}
</style>
