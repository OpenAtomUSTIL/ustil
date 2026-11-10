<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
}>()
</script>

<template>
  <div class="empty">
    <b>{{ title }}</b>
    <span v-if="hint">{{ hint }}</span>
    <slot />
  </div>
</template>
