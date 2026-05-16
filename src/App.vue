<script setup lang="ts">
import { onMounted } from 'vue';
import { useSettingsStore } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import AppShell from './components/layout/AppShell.vue';
import HomePage from './pages/HomePage.vue';

const settingsStore = useSettingsStore();
const fileStore = useFileStore();

onMounted(() => {
  settingsStore.init();
  fileStore.loadRecentFiles();
});
</script>

<template>
  <AppShell>
    <template #welcome>
      <HomePage />
    </template>
  </AppShell>
</template>