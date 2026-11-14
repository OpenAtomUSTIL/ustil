<script setup lang="ts">
import { formatReadingTime } from '@/utils/reading-time'
import { contentPathId } from '@/utils/content-path'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { articlesApi } from '@/api/request'
import type { ArticleDetail } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, roleLabel, timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import StatusBadge from '@/components/StatusBadge.vue'
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

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    article.value = await articlesApi.get(articleId.value)
    // 旧 id 链接 → 301 到 slug 规范地址
    if (article.value && route.params.id !== contentPathId(article.value)) {
      void router.replace({ name: 'article-detail', params: { id: contentPathId(article.value) } })
    }
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
          <StatusBadge kind="article" :value="article.status" />
          <span v-if="article.status === 'PENDING'" class="st-hint">文章已提交，等待管理员审核后发布</span>
          <span v-else-if="article.status === 'REJECTED'" class="st-hint">文章未通过审核<span v-if="article.reviewNote">：{{ article.reviewNote }}</span></span>
          <span v-else-if="article.status === 'HIDDEN'" class="st-hint">文章已被管理员隐藏</span>
        </div>
        <div class="tc-meta">
          <RouterLink class="who" :to="{ name: 'user-profile', params: { id: article.author.username } }">
            <AppAvatar
              :nickname="article.author.nickname"
              :avatar-url="article.author.avatarUrl"
              :user-id="article.author.id"
              size="lg"
            />
            {{ article.author.nickname }} · {{ roleLabel(article.author.role) }}
          </RouterLink>
          <span class="num">{{ timeAgo(article.createdAt) }}</span>
          <span v-if="formatReadingTime(article.readingMinutes)" class="num">{{ formatReadingTime(article.readingMinutes) }}</span>
          <span class="num">更新于 {{ formatDateTime(article.updatedAt) }}</span>
        </div>
      </div>

      <div class="post-block">
        <MarkdownBody class="pb-body" :content="article.content" />
        <div class="pb-actions">
          <RouterLink
            v-if="canEdit"
            class="btn btn-secondary"
            :to="{ name: 'article-edit', params: { id: contentPathId(article) } }"
          >
            编辑
          </RouterLink>
          <button v-if="canDelete" class="btn btn-ghost" type="button" @click="confirmDelete = true">
            删除
          </button>
        </div>
      </div>
    </article>

    <LoadingState v-else-if="loading" />
    <EmptyState v-else-if="error" title="加载失败" :hint="error">
      <p>
        <button class="btn btn-sm btn-secondary" type="button" @click="load">重试</button>
      </p>
    </EmptyState>
    <EmptyState v-else title="文章不存在" hint="它可能已被删除。" />

    <ConfirmModal
      v-if="confirmDelete"
      title="确认删除？"
      message="删除后可在后台回收站恢复"
      confirm-text="删除"
      :busy="deleting"
      @confirm="remove"
      @cancel="confirmDelete = false"
    />
  </div>
</template>

<style scoped>
.head-tags {
  margin-top: 1rem;
}
/* .st-hint 为横幅内提示文案，全局未定义，保留在本视图 */
.st-hint {
  font-size: 0.85rem;
}
</style>
