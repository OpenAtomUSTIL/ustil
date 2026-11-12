<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { articlesApi } from '@/api/request'
import type { ArticleDetail } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, roleLabel, timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import TagsChips from '@/components/TagsChips.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const article = ref<ArticleDetail | null>(null)
const loading = ref(true)
const error = ref('')
const confirmDelete = ref(false)
const deleting = ref(false)

const articleId = computed(() => String(route.params.id))

const isAuthor = computed(() => auth.user !== null && article.value?.author.id === auth.user.id)
const isMember = computed(() => auth.role === 'MEMBER')
const isPendingOrRejected = computed(() => article.value?.status === 'PENDING' || article.value?.status === 'REJECTED')
/** 入口显隐仅为体验优化，权限以后端为准 */
const canEdit = computed(() => {
  if (!isAuthor.value) return false
  if (isMember.value) return isPendingOrRejected.value
  return auth.canManageContent
})
const canDelete = computed(() => {
  if (auth.isAdmin) return true
  if (!isAuthor.value) return false
  if (isMember.value) return isPendingOrRejected.value
  return auth.canManageContent
})
const statusLabel = computed(() => {
  const map: Record<string, string> = { PENDING: '待审核', PUBLISHED: '已发布', REJECTED: '已拒绝', HIDDEN: '已隐藏' }
  return article.value ? map[article.value.status] ?? article.value.status : ''
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    article.value = await articlesApi.get(articleId.value)
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

async function remove(): Promise<void> {
  if (!article.value || deleting.value) return
  deleting.value = true
  try {
    await articlesApi.remove(article.value.id)
    toast.show('已移入回收站')
    await router.push({ name: 'articles' })
  } catch (err) {
    confirmDelete.value = false
    toast.show(describeError(err))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container">
    <article v-if="article" class="thread">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink :to="{ name: 'home' }">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="{ name: 'articles' }">文章</RouterLink>
        <span>/</span>
        <span>正文</span>
      </nav>

      <div class="thread-head">
        <h1>{{ article.title }}</h1>
        <TagsChips v-if="article.tags.length > 0" class="head-tags" :tags="article.tags" target="articles" />
        <div v-if="article.status !== 'PUBLISHED'" class="status-banner" :class="`st-${article.status.toLowerCase()}`">
          <span class="st-badge">{{ statusLabel }}</span>
          <span v-if="article.status === 'PENDING'" class="st-hint">文章已提交，等待管理员审核后发布</span>
          <span v-else-if="article.status === 'REJECTED'" class="st-hint">文章未通过审核<span v-if="article.reviewNote">：{{ article.reviewNote }}</span></span>
          <span v-else-if="article.status === 'HIDDEN'" class="st-hint">文章已被管理员隐藏</span>
        </div>
        <div class="tc-meta">
          <span class="who">
            <AppAvatar
              :nickname="article.author.nickname"
              :avatar-url="article.author.avatarUrl"
              :user-id="article.author.id"
              size="lg"
            />
            {{ article.author.nickname }} · {{ roleLabel(article.author.role) }}
          </span>
          <span class="num">{{ timeAgo(article.createdAt) }}</span>
          <span class="num">更新于 {{ formatDateTime(article.updatedAt) }}</span>
        </div>
      </div>

      <div class="post-block">
        <MarkdownBody class="pb-body" :content="article.content" />
        <div class="pb-actions">
          <RouterLink
            v-if="canEdit"
            class="btn btn-secondary"
            :to="{ name: 'article-edit', params: { id: article.id } }"
          >
            编辑
          </RouterLink>
          <template v-if="canDelete">
            <button
              v-if="!confirmDelete"
              class="btn btn-ghost"
              type="button"
              @click="confirmDelete = true"
            >
              删除
            </button>
            <button
              v-else
              class="btn btn-danger"
              type="button"
              :disabled="deleting"
              @click="remove"
            >
              {{ deleting ? '删除中…' : '确认删除？' }}
            </button>
            <span v-if="confirmDelete" class="rm-hint">删除后可在后台回收站恢复</span>
            <button
              v-if="confirmDelete"
              class="btn btn-ghost"
              type="button"
              :disabled="deleting"
              @click="confirmDelete = false"
            >
              取消
            </button>
          </template>
        </div>
      </div>
    </article>

    <div v-else-if="loading" class="empty" style="margin-top: 3rem">加载中…</div>
    <EmptyState v-else-if="error" title="加载失败" :hint="error" />
    <EmptyState v-else title="文章不存在" hint="它可能已被删除。" />
  </div>
</template>

<style scoped>
.head-tags {
  margin-top: 1rem;
}
.status-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.st-pending {
  background: #fef3cd;
  color: #856404;
}
.st-rejected {
  background: #f8d7da;
  color: #721c24;
}
.st-hidden {
  background: #e2e3e5;
  color: #383d41;
}
.st-badge {
  font-weight: 600;
  font-size: 0.85rem;
}
.st-hint {
  font-size: 0.85rem;
}
</style>
