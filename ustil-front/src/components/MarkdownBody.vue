<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ content: string }>()

const html = computed(() => renderMarkdown(props.content))

function onClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest('.md-copy')
  if (!button) return
  const text = button.closest('pre')?.querySelector('code')?.textContent ?? ''
  navigator.clipboard.writeText(text).then(() => {
    button.textContent = '已复制'
    setTimeout(() => {
      button.textContent = '复制'
    }, 1500)
  })
}
</script>

<template>
  <!-- 渲染产物已经 DOMPurify 消毒 -->
  <div class="md-body" @click="onClick" v-html="html" />
</template>

<style scoped>
.md-body :deep(pre) {
  background: var(--gray-100);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  padding: 0.75rem 1rem 0.75rem 0.25rem;
  overflow-x: auto;
  position: relative;
  counter-reset: line;
  margin: 0.85rem 0;
}

.md-body :deep(pre code) {
  display: block;
  white-space: normal;
  background: transparent;
}

.md-body :deep(.md-code-line) {
  display: block;
  white-space: pre;
  counter-increment: line;
}

.md-body :deep(.md-code-line::before) {
  content: counter(line);
  display: inline-block;
  width: 2.5em;
  padding-right: 0.5em;
  text-align: right;
  color: var(--ink-faint);
  user-select: none;
}

.md-body :deep(.md-copy) {
  position: absolute;
  top: 0.45rem;
  right: 0.55rem;
  padding: 0.15rem 0.55rem;
  font-size: var(--fs-meta);
  line-height: 1.5;
  color: var(--ink-muted);
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-pill);
  cursor: pointer;
}

.md-body :deep(.md-copy:hover) {
  color: var(--ink);
  border-color: var(--border-strong);
}

.md-body :deep(pre[data-lang]::after) {
  content: attr(data-lang);
  position: absolute;
  top: 0.55rem;
  right: 4.25rem;
  padding: 0.15rem 0.55rem;
  font-size: var(--fs-meta);
  color: var(--ink-muted);
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-pill);
}
</style>
