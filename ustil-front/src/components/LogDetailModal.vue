<script setup lang="ts">
/* 日志详情弹层（v8.0 追加）：label/value 字段行 + 可选 JSON 块，三类日志共用 */
import ModalOverlay from './ModalOverlay.vue'

type DetailField = {
  label: string
  value: string
  mono?: boolean
}

defineProps<{
  title: string
  fields: DetailField[]
  json?: Record<string, unknown> | null
  jsonLabel?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <ModalOverlay wide @close="emit('close')">
    <h3>{{ title }}</h3>
    <dl class="log-detail">
      <template v-for="field in fields" :key="field.label">
        <dt>{{ field.label }}</dt>
        <dd :class="{ mono: field.mono }">{{ field.value || '—' }}</dd>
      </template>
    </dl>
    <div v-if="json" class="log-json">
      <span class="log-json-label">{{ jsonLabel ?? '附加数据' }}</span>
      <pre>{{ JSON.stringify(json, null, 2) }}</pre>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" type="button" @click="emit('close')">关闭</button>
    </div>
  </ModalOverlay>
</template>

<style scoped>
.log-detail {
  display: grid;
  grid-template-columns: minmax(4.5rem, max-content) minmax(0, 1fr);
  gap: 0.55rem 1.15rem;
  margin-top: 1.15rem;
  font-size: var(--fs-meta);
}

.log-detail dt {
  color: var(--ink-faint);
  white-space: nowrap;
}

.log-detail dd {
  margin: 0;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.log-detail dd.mono {
  font-family: var(--font-mono);
  font-size: 0.82em;
  color: var(--ink-muted);
}

.log-json {
  margin-top: 1.15rem;
}

.log-json-label {
  display: block;
  font-size: var(--fs-small);
  color: var(--ink-faint);
  margin-bottom: 0.45rem;
}

.log-json pre {
  margin: 0;
  padding: 0.75rem 0.9rem;
  background: var(--gray-100);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.65;
  max-height: 40vh;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 480px) {
  /* label/value 描述栅格折叠为单列：标签在上、值在下，把宽度让给长值 */
  .log-detail {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .log-detail dt {
    margin-top: 0.55rem;
  }

  .log-detail dt:first-of-type {
    margin-top: 0;
  }
}
</style>
