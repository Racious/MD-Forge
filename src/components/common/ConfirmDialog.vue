<script setup lang="ts">
defineProps<{ message: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="dialog">
      <p class="dialog-msg">{{ message }}</p>
      <div class="dialog-actions">
        <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
        <button class="btn-confirm" @click="emit('confirm')">Discard</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 24px;
  max-width: 360px;
  width: 100%;
}
.dialog-msg { margin: 0 0 20px; font-size: 14px; color: var(--color-text); line-height: 1.5; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-cancel, .btn-confirm {
  padding: 6px 16px;
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--color-border);
}
.btn-cancel { background: transparent; color: var(--color-text); }
.btn-cancel:hover { background: var(--color-surface-hover); }
.btn-confirm { background: var(--color-danger); border-color: var(--color-danger); color: #fff; }
.btn-confirm:hover { opacity: 0.85; }
</style>
