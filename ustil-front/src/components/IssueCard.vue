<script setup lang="ts">
import type { IssueListItem } from '@/api/types'
import { timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TagsChips from '@/components/TagsChips.vue'

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
    <TagsChips v-if="issue.tags.length > 0" class="card-tags" :tags="issue.tags" target="issues" />
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

<style scoped>
.card-tags {
  margin-top: 0.75rem;
}
</style>
