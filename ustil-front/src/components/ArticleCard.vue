<script setup lang="ts">
import type { ArticleListItem } from '@/api/types'
import { timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import TagsChips from '@/components/TagsChips.vue'

defineProps<{ article: ArticleListItem }>()
</script>

<template>
  <div class="topic-card">
    <div class="tc-top">
      <span class="tag tag-cat" data-tone="clay">文章</span>
    </div>
    <h3>
      <RouterLink class="tc-title-link" :to="{ name: 'article-detail', params: { id: article.slug } }">
        {{ article.title }}
      </RouterLink>
    </h3>
    <MarkdownBody class="tc-preview" :content="article.excerpt" preview />
    <TagsChips v-if="article.tags.length > 0" class="card-tags" :tags="article.tags" target="articles" />
    <div class="tc-meta">
      <RouterLink class="who" :to="{ name: 'user-profile', params: { id: article.author.username } }">
        <AppAvatar :nickname="article.author.nickname" :avatar-url="article.author.avatarUrl" :user-id="article.author.id" />
        {{ article.author.nickname }}
      </RouterLink>
      <span class="num">{{ timeAgo(article.createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.card-tags {
  margin-top: 0.75rem;
}
</style>
