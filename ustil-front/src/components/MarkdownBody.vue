<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ content: string }>()

const html = computed(() => renderMarkdown(props.content))

const resetTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

function flash(button: Element, message: string): void {
  button.textContent = message
  const pending = resetTimers.get(button)
  if (pending !== undefined) clearTimeout(pending)
  resetTimers.set(
    button,
    setTimeout(() => {
      button.textContent = '复制'
      resetTimers.delete(button)
    }, 1500),
  )
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

function onClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest('.md-copy')
  if (!button) return
  const text = button.closest('pre')?.querySelector('code')?.textContent ?? ''
  const write = navigator.clipboard?.writeText(text)
  if (write === undefined) {
    flash(button, legacyCopy(text) ? '已复制' : '复制失败')
    return
  }
  write
    .then(() => flash(button, '已复制'))
    .catch(() => flash(button, legacyCopy(text) ? '已复制' : '复制失败'))
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
  position: relative;
  counter-reset: line;
  margin: 0.85rem 0;
}

.md-body :deep(pre code) {
  display: block;
  overflow-x: auto;
  white-space: normal;
  background: transparent;
}

.md-body :deep(.md-code-line) {
  display: block;
  white-space: pre;
  counter-increment: line;
  width: max-content;
  min-width: 100%;
}

.md-body :deep(.md-code-line::before) {
  content: counter(line);
  display: inline-block;
  position: sticky;
  left: 0;
  width: 2.5em;
  padding-right: 0.5em;
  text-align: right;
  color: var(--ink-faint);
  background: var(--gray-100);
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
