<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toast-wrap" role="status" aria-live="polite">
    <div v-for="item in toast.items" :key="item.id" class="toast">{{ item.message }}</div>
  </div>
</template>
