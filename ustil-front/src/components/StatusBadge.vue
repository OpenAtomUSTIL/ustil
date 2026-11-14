<script setup lang="ts">
import { computed } from 'vue'
import type { ArticleStatus, AssignmentState, IssueStatus } from '@/api/types'

const props = defineProps<{
  kind: 'issue' | 'assignment' | 'article'
  value: IssueStatus | AssignmentState | ArticleStatus
}>()

const LABELS: Record<string, string> = {
  OPEN: '未解决',
  ANSWERED: '已解答',
  ON_HOLD: '搁置',
  NOT_STARTED: '未开始',
  CLOSED: '已截止',
  PENDING: '待审核',
  PUBLISHED: '已发布',
  REJECTED: '已驳回',
  HIDDEN: '已隐藏',
}

const label = computed(() => {
  if (props.kind === 'assignment' && props.value === 'OPEN') return '进行中'
  return LABELS[props.value] ?? props.value
})

const cls = computed(() => {
  if (props.kind === 'article') {
    if (props.value === 'PENDING') return 'badge-pending'
    if (props.value === 'PUBLISHED') return 'badge-published'
    if (props.value === 'REJECTED') return 'badge-rejected'
    return 'badge-hidden'
  }
  if (props.kind === 'issue') {
    if (props.value === 'ANSWERED') return 'badge-answered'
    if (props.value === 'ON_HOLD') return 'badge-hold'
    return 'badge-open'
  }
  if (props.value === 'NOT_STARTED') return 'badge-not-started'
  if (props.value === 'OPEN') return 'badge-state-open'
  return 'badge-closed'
})
</script>

<template>
  <span class="badge" :class="cls">{{ label }}</span>
</template>
