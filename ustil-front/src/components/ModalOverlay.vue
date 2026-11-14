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
