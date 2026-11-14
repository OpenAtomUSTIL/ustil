<script setup lang="ts">
import ModalOverlay from './ModalOverlay.vue'

withDefaults(defineProps<{
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  busy?: boolean
}>(), {
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  danger: true,
  busy: false,
})

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <ModalOverlay @close="emit('cancel')">
    <h3>{{ title }}</h3>
    <p v-if="message" class="modal-msg">{{ message }}</p>
    <slot />
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" :disabled="busy" @click="emit('cancel')">
        {{ cancelText }}
      </button>
      <button
        type="button"
        class="btn"
        :class="danger ? 'btn-danger' : 'btn-primary'"
        :disabled="busy"
        @click="emit('confirm')"
      >
        {{ confirmText }}
      </button>
    </div>
  </ModalOverlay>
</template>
