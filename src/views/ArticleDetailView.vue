<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { articlesApi, describeError, isForbidden } from '@/api/request'
import type { ArticleDetail } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, roleLabel, timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'

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
/** 入口显隐仅为体验优化，权限以后端为准 */
const canEdit = computed(() => auth.canManageContent && (auth.isAdmin || isAuthor.value))
const canDelete = computed(() => auth.isAdmin || (auth.canManageContent && isAuthor.value))

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
    toast.show('文章已删除')
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
