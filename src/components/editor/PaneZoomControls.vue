<script setup lang="ts">
defineProps<{ label: string; size: number }>();
</script>

<template>
  <div class="pane-zoom-controls" data-zoom-exclude>
    <span>{{ label }} · {{ size }}px</span>
  </div>
</template>

<style scoped>
.pane-zoom-controls {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding: 5px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
