<script setup lang="ts">
import type { IssueListItem } from '@/api/types'
import { timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import StatusBadge from '@/components/StatusBadge.vue'

defineProps<{ issue: IssueListItem }>()
</script>

<template>
  <RouterLink class="topic-card" :to="{ name: 'issue-detail', params: { id: issue.id } }">
    <div class="tc-top">
      <StatusBadge kind="issue" :value="issue.status" />
      <span v-if="issue.status === 'ANSWERED' && issue.answeredBy" class="tag tag-hash">
        由 {{ issue.answeredBy.nickname }} 解答
      </span>
    </div>
    <h3>{{ issue.title }}</h3>
    <div class="tc-meta">
      <span class="who">
        <AppAvatar :nickname="issue.author.nickname" :avatar-url="issue.author.avatarUrl" :user-id="issue.author.id" />
        {{ issue.author.nickname }}
      </span>
      <span class="num">{{ issue.replyCount }} 条回复</span>
      <span class="num">{{ timeAgo(issue.createdAt) }}</span>
    </div>
  </RouterLink>
</template>
