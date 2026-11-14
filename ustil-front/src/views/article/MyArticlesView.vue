<script setup lang="ts">
import { contentPathId } from '@/utils/content-path'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { articlesApi } from '@/api/request'
import type { ArticleListItem } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const items = ref<ArticleListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref('')
const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

const statusLabel: Record<string, string> = {
  PENDING: '待审核',
  PUBLISHED: '已发布',
  REJECTED: '已拒绝',
  HIDDEN: '已隐藏',
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  confirmDeleteId.value = null
  const authorId = auth.user?.id
  if (!authorId) {
    loading.value = false
    error.value = '请先登录'
    return
  }
  try {
    const result = await articlesApi.list({ authorId, page: page.value, pageSize })
    items.value = result.items
    total.value = result.total
    page.value = result.page
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

function changePage(next: number): void {
  page.value = next
  void load()
}

async function remove(id: string): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  try {
    await articlesApi.remove(id)
    toast.show('已移入回收站')
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    await load()
  } catch (err) {
    confirmDeleteId.value = null
    toast.show(describeError(err))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>我的文章</h2>
          <RouterLink class="btn btn-clay" :to="{ name: 'article-new' }">写文章</RouterLink>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <p style="margin-top: 1.15rem">
            <button class="btn btn-secondary" type="button" @click="load">重试</button>
          </p>
        </EmptyState>
        <EmptyState v-else-if="items.length === 0" title="还没有发布过文章" hint="写下第一篇，分享你的实践与思考。">
          <p style="margin-top: 1.15rem">
            <RouterLink class="btn btn-clay" :to="{ name: 'article-new' }">去写文章</RouterLink>
          </p>
        </EmptyState>
        <div v-else class="topic-list">
          <div v-for="article in items" :key="article.id" class="topic-card">
            <h3>{{ article.title }}</h3>
            <div class="tc-meta">
              <span class="st-chip" :class="`st-${article.status.toLowerCase()}`">{{ statusLabel[article.status] ?? article.status }}</span>
              <span class="num">创建于 {{ formatDateTime(article.createdAt) }}</span>
              <span class="num">更新于 {{ formatDateTime(article.updatedAt) }}</span>
            </div>
            <div class="row-actions">
              <RouterLink class="btn btn-ghost btn-sm" :to="{ name: 'article-detail', params: { id: contentPathId(article) } }">
                查看
              </RouterLink>
              <RouterLink class="btn btn-secondary btn-sm" :to="{ name: 'article-edit', params: { id: contentPathId(article) } }">
                编辑
              </RouterLink>
              <template v-if="confirmDeleteId === article.id">
                <button class="btn btn-danger btn-sm" type="button" :disabled="deleting" @click="remove(article.id)">
                  {{ deleting ? '删除中…' : '确认删除？' }}
                </button>
                <button class="btn btn-ghost btn-sm" type="button" :disabled="deleting" @click="confirmDeleteId = null">
                  取消
                </button>
                <span class="rm-hint">删除后可在后台回收站恢复</span>
              </template>
              <button v-else class="btn btn-ghost btn-sm" type="button" @click="confirmDeleteId = article.id">
                删除
              </button>
            </div>
          </div>
        </div>

        <BasePagination
          v-if="!loading && !error && total > 0"
          :page="page"
          :page-size="pageSize"
          :total="total"
          @change="changePage"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.row-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.st-chip {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.st-pending {
  background: rgba(217, 119, 87, 0.12);
  color: var(--clay-dark);
}
.st-published {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
}
.st-rejected {
  background: rgba(191, 77, 67, 0.12);
  color: var(--error);
}
.st-hidden {
  background: var(--gray-200);
  color: var(--ink-muted);
}
</style>
