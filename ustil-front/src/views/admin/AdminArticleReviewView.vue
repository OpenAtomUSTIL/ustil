<script setup lang="ts">
/* 文章审核：GET /articles/pending（待审列表）；approve 通过 / reject 拒绝 / hide 隐藏 / unhide 取消隐藏 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { ArticleListItem, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, roleLabel } from '@/utils/format'

const page = ref(1)
const pageSize = 20

const data = ref<Page<ArticleListItem> | null>(null)
const loading = ref(true)
const error = ref('')

const actionId = ref<string | null>(null)
const actionType = ref<'approve' | 'reject' | 'hide' | 'unhide' | null>(null)
const rejectNote = ref('')
const acting = ref(false)

const toast = useToastStore()

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listPendingArticles({ page: page.value, pageSize })
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function review(item: ArticleListItem, action: 'approve' | 'reject' | 'hide' | 'unhide'): Promise<void> {
  if (acting.value) return
  if (action === 'reject' && !rejectNote.value.trim()) {
    toast.show('请填写拒绝原因')
    return
  }
  acting.value = true
  actionId.value = item.id
  actionType.value = action
  try {
    await adminApi.reviewArticle(item.id, {
      action,
      note: action === 'reject' ? rejectNote.value.trim() : undefined,
    })
    const labels = { approve: '已通过', reject: '已拒绝', hide: '已隐藏', unhide: '已取消隐藏' }
    toast.show(labels[action])
    actionId.value = null
    actionType.value = null
    rejectNote.value = ''
    await load()
  } catch (err) {
    toast.show(describeError(err))
    actionId.value = null
    actionType.value = null
  } finally {
    acting.value = false
  }
}

function startReject(item: ArticleListItem): void {
  actionId.value = item.id
  actionType.value = 'reject'
  rejectNote.value = ''
}

function cancelAction(): void {
  actionId.value = null
  actionType.value = null
  rejectNote.value = ''
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>文章审核</h2>
      <span v-if="data" class="hint">待审 {{ data.total }} 篇</span>
    </div>

    <div v-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="error" title="加载失败" :hint="error">
      <p style="margin-top: 1.15rem">
        <button class="btn btn-secondary" type="button" @click="load">重试</button>
      </p>
    </EmptyState>
    <EmptyState v-else-if="!data || data.items.length === 0" title="没有待审文章" hint="所有文章都已处理完毕。" />
    <div v-else class="review-list">
      <div v-for="item in data.items" :key="item.id" class="review-card">
        <div class="rc-head">
          <h3>{{ item.title }}</h3>
          <span class="rc-author">{{ item.author.nickname }}（{{ roleLabel(item.author.role) }}）</span>
        </div>
        <p class="rc-excerpt">{{ item.excerpt }}</p>
        <div class="rc-meta">
          <span>创建于 {{ formatDateTime(item.createdAt) }}</span>
          <span v-if="item.tags.length > 0" class="rc-tags">{{ item.tags.join(' · ') }}</span>
        </div>
        <div class="rc-actions">
          <template v-if="actionId === item.id && actionType === 'reject'">
            <input
              v-model="rejectNote"
              class="reject-input"
              placeholder="拒绝原因（必填）"
              maxlength="500"
            >
            <button class="btn btn-danger btn-sm" type="button" :disabled="acting" @click="review(item, 'reject')">
              {{ acting ? '提交中…' : '确认拒绝' }}
            </button>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="acting" @click="cancelAction">取消</button>
          </template>
          <template v-else>
            <button class="btn btn-secondary btn-sm" type="button" :disabled="acting" @click="review(item, 'approve')">
              通过
            </button>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="acting" @click="startReject(item)">
              拒绝
            </button>
            <RouterLink class="btn btn-ghost btn-sm" :to="{ name: 'article-detail', params: { id: item.id } }">
              查看全文
            </RouterLink>
          </template>
        </div>
      </div>
    </div>

    <BasePagination
      v-if="!loading && !error && data && data.total > 0"
      :page="page"
      :page-size="pageSize"
      :total="data.total"
      @change="changePage"
    />
  </div>
</template>

<style scoped>
.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.review-card {
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 1rem 1.25rem;
}
.rc-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.rc-head h3 {
  margin: 0;
  font-size: 1.05rem;
}
.rc-author {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
}
.rc-excerpt {
  margin: 0.5rem 0;
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
  line-height: 1.5;
}
.rc-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted, #999);
  flex-wrap: wrap;
}
.rc-tags {
  color: var(--accent, #666);
}
.rc-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}
.reject-input {
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 6px;
  font-size: 0.85rem;
  width: 220px;
}
</style>
