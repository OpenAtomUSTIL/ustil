<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    page: number
    pageSize: number
    total: number
  }>(),
  {},
)

const emit = defineEmits<{ change: [page: number] }>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function go(page: number): void {
  if (page < 1 || page > pageCount.value || page === props.page) return
  emit('change', page)
}
</script>

<template>
  <nav class="pagination" aria-label="分页">
    <button class="chip" :disabled="page <= 1" @click="go(page - 1)">上一页</button>
    <span class="page-info">第 {{ page }} / {{ pageCount }} 页 · 共 {{ total }} 条</span>
    <button class="chip" :disabled="page >= pageCount" @click="go(page + 1)">下一页</button>
  </nav>
</template>
