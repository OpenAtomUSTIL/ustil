<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

withDefaults(defineProps<{ wide?: boolean }>(), { wide: false })

const emit = defineEmits<{ close: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" role="presentation" @click.self="emit('close')">
      <div class="modal-card" :class="{ 'modal-wide': wide }" role="dialog" aria-modal="true">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media (max-width: 820px) {
  /* 内容高于视口时改为可滚动：align-items 归位 + 卡片 auto 外边距居中，
     避免 flex 居中在溢出时把弹层顶部裁掉、无法滚到 */
  .modal-overlay {
    overflow-y: auto;
    align-items: flex-start;
  }

  .modal-card {
    margin-top: auto;
    margin-bottom: auto;
  }
}
</style>
