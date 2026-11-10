<script setup lang="ts">
import { computed } from 'vue'
import type { AssignmentState, IssueStatus } from '@/api/types'

const props = defineProps<{
  kind: 'issue' | 'assignment'
  value: IssueStatus | AssignmentState
}>()

const LABELS: Record<string, string> = {
  OPEN: '未解决',
  ANSWERED: '已解答',
  ON_HOLD: '搁置',
  NOT_STARTED: '未开始',
  CLOSED: '已截止',
}

const label = computed(() => {
  if (props.kind === 'assignment' && props.value === 'OPEN') return '进行中'
  return LABELS[props.value] ?? props.value
})

const cls = computed(() => {
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
