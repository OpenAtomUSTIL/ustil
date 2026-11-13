<script setup lang="ts">
import type { IssueListItem } from '@/api/types'
import { timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TagsChips from '@/components/TagsChips.vue'

defineProps<{ issue: IssueListItem }>()
</script>

<template>
  <div class="topic-card">
    <div class="tc-top">
      <StatusBadge kind="issue" :value="issue.status" />
      <span v-if="issue.status === 'ANSWERED' && issue.answeredBy" class="tag tag-hash">
        由
        <RouterLink class="inline-user" :to="{ name: 'user-profile', params: { id: issue.answeredBy.username } }">
          {{ issue.answeredBy.nickname }}
        </RouterLink>
        解答
      </span>
    </div>
    <h3>
      <RouterLink class="tc-title-link" :to="{ name: 'issue-detail', params: { id: issue.slug } }">
        {{ issue.title }}
      </RouterLink>
    </h3>
    <TagsChips v-if="issue.tags.length > 0" class="card-tags" :tags="issue.tags" target="issues" />
    <div class="tc-meta">
      <RouterLink class="who" :to="{ name: 'user-profile', params: { id: issue.author.username } }">
        <AppAvatar :nickname="issue.author.nickname" :avatar-url="issue.author.avatarUrl" :user-id="issue.author.id" />
        {{ issue.author.nickname }}
      </RouterLink>
      <span class="num">{{ issue.replyCount }} 条回复</span>
      <span class="num">{{ timeAgo(issue.createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.card-tags {
  margin-top: 0.75rem;
}
</style>
