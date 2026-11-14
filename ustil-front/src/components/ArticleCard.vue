<script setup lang="ts">
import { formatReadingTime } from '@/utils/reading-time'
import { contentPathId } from '@/utils/content-path'
import { computed } from 'vue'
import { markdownSummary } from '@/utils/markdown'
import type { ArticleListItem } from '@/api/types'
import { timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import TagsChips from '@/components/TagsChips.vue'

const props = defineProps<{ article: ArticleListItem }>()
const summary = computed(() => markdownSummary(props.article.excerpt))
</script>

<template>
  <div class="topic-card">
    <div class="tc-top">
      <span class="tag tag-cat" data-tone="clay">文章</span>
    </div>
    <h3>
      <RouterLink class="tc-title-link" :to="{ name: 'article-detail', params: { id: contentPathId(article) } }">
        {{ article.title }}
      </RouterLink>
    </h3>
    <p class="article-summary">{{ summary }}</p>
    <TagsChips v-if="article.tags.length > 0" class="card-tags" :tags="article.tags" target="articles" />
    <div class="tc-meta">
      <RouterLink class="who" :to="{ name: 'user-profile', params: { id: article.author.username } }">
        <AppAvatar :nickname="article.author.nickname" :avatar-url="article.author.avatarUrl" :user-id="article.author.id" />
        {{ article.author.nickname }}
      </RouterLink>
      <span class="num">{{ timeAgo(article.createdAt) }}</span>
      <span v-if="formatReadingTime(article.readingMinutes)" class="num">{{ formatReadingTime(article.readingMinutes) }}</span>
    </div>
  </div>
</template>

<style scoped>
.article-summary {
  margin-top: 0.65rem;
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  line-height: 1.7;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  margin-top: 0.75rem;
}
</style>
