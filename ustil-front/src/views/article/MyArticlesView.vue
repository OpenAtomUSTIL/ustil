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
import ConfirmModal from '@/components/ConfirmModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import StatusBadge from '@/components/StatusBadge.vue'

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

function confirmRemove(): void {
  const id = confirmDeleteId.value
  if (id !== null) void remove(id)
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

        <LoadingState v-if="loading" />
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <p>
            <button class="btn btn-sm btn-secondary" type="button" @click="load">重试</button>
          </p>
        </EmptyState>
        <EmptyState v-else-if="items.length === 0" title="还没有发布过文章" hint="写下第一篇，分享你的实践与思考。">
          <p>
            <RouterLink class="btn btn-clay" :to="{ name: 'article-new' }">去写文章</RouterLink>
          </p>
        </EmptyState>
        <div v-else class="topic-list">
          <div v-for="article in items" :key="article.id" class="topic-card">
            <h3>{{ article.title }}</h3>
            <div class="tc-meta">
              <StatusBadge kind="article" :value="article.status" />
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
              <button class="btn btn-ghost btn-sm" type="button" @click="confirmDeleteId = article.id">
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

    <ConfirmModal
      v-if="confirmDeleteId !== null"
      title="确认删除？"
      message="删除后可在后台回收站恢复"
      confirm-text="删除"
      :busy="deleting"
      @confirm="confirmRemove"
      @cancel="confirmDeleteId = null"
    />
  </div>
</template>
