<script setup lang="ts">
import type { ArticleListItem } from '@/api/types'
import { timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import TagsChips from '@/components/TagsChips.vue'

defineProps<{ article: ArticleListItem }>()
</script>

<template>
  <RouterLink class="topic-card" :to="{ name: 'article-detail', params: { id: article.id } }">
    <div class="tc-top">
      <span class="tag tag-cat" data-tone="clay">文章</span>
    </div>
    <h3>{{ article.title }}</h3>
    <MarkdownBody class="tc-preview" :content="article.excerpt" preview />
    <TagsChips v-if="article.tags.length > 0" class="card-tags" :tags="article.tags" target="articles" />
    <div class="tc-meta">
      <span class="who">
        <AppAvatar :nickname="article.author.nickname" :avatar-url="article.author.avatarUrl" :user-id="article.author.id" />
        {{ article.author.nickname }}
      </span>
      <span class="num">{{ timeAgo(article.createdAt) }}</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.card-tags {
  margin-top: 0.75rem;
}
</style>
