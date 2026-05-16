<script setup lang="ts">
// EditorPage hosts the AppShell with its editor/preview panes.
// All logic is delegated to the stores via AppShell.
</script>

<template>
  <div class="editor-page">
    <slot />
  </div>
</template>

<style scoped>
.editor-page {
  display: contents;
}
</style>
