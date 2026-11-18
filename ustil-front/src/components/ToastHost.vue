<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toast-wrap" role="status" aria-live="polite">
    <div v-for="item in toast.items" :key="item.id" class="toast">{{ item.message }}</div>
  </div>
</template>

<style scoped>
@media (max-width: 820px) {
  /* 长消息（文件名/错误串）不许把胶囊顶出视口，超出宽度强制断行 */
  .toast {
    max-width: calc(100vw - 2rem);
    overflow-wrap: anywhere;
  }
}
</style>
