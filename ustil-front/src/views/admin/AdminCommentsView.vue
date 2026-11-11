<script setup lang="ts">
/* 评论管理：GET /admin/comments（含已软删除）；keyword 搜索；软删除移入回收站 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { CommentItem, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

const keywordFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<CommentItem> | null>(null)
const loading = ref(true)
const error = ref('')

const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

const toast = useToastStore()

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listComments({
      page: page.value,
      pageSize,
      keyword: keywordFilter.value.trim() || undefined,
    })
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function reset(): void {
  keywordFilter.value = ''
  search()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function remove(item: CommentItem): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  try {
    await adminApi.deleteComment(item.id)
    toast.show('已移入回收站')
    confirmDeleteId.value = null
    await load()
  } catch (err) {
    toast.show(describeError(err))
    confirmDeleteId.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>评论管理</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 条</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent="search">
      <div class="field">
        <input
          v-model="keywordFilter"
          type="search"
          placeholder="内容 / 作者 / 讨论标题"
          aria-label="关键词"
          :maxlength="KEYWORD_MAX"
        >
      </div>
      <button class="btn btn-secondary" type="submit">搜索</button>
      <button class="btn btn-ghost" type="button" @click="reset">重置</button>
    </form>

    <div v-if="error" class="state-box">
      <p class="form-error">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="没有匹配的评论" hint="换个筛选条件试试" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>讨论标题</th>
            <th>作者</th>
            <th>内容摘要</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td>
              <RouterLink class="issue-link" :to="{ name: 'issue-detail', params: { id: item.issueId } }">
                {{ item.issueTitle }}
              </RouterLink>
            </td>
            <td>{{ item.authorName }}</td>
            <td class="content-cell" :title="item.content">{{ item.content }}</td>
            <td>
              <span class="state-badge" :class="item.deletedAt ? 'state-deleted' : 'state-normal'">
                {{ item.deletedAt ? '已删除' : '正常' }}
              </span>
            </td>
            <td>
              <template v-if="item.deletedAt">
                <span class="muted">已移入回收站</span>
              </template>
              <template v-else-if="confirmDeleteId === item.id">
                <button
                  class="btn btn-sm btn-danger"
                  type="button"
                  :disabled="deleting"
                  @click="remove(item)"
                >
                  {{ deleting ? '删除中…' : '确认删除？' }}
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  type="button"
                  :disabled="deleting"
                  @click="confirmDeleteId = null"
                >
                  取消
                </button>
              </template>
              <button
                v-else
                class="btn btn-sm btn-ghost"
                type="button"
                title="删除后可在后台回收站恢复"
                @click="confirmDeleteId = item.id"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <BasePagination :page="page" :page-size="pageSize" :total="data.total" @change="changePage" />
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.filter-bar .field {
  margin: 0;
}

.filter-bar input {
  min-width: 16rem;
  padding: 0.5rem 0.75rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-raised);
  font-size: var(--fs-meta);
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  font-size: var(--fs-meta);
}

.admin-table th,
.admin-table td {
  padding: 0.75rem 0.9rem;
  text-align: left;
  border-bottom: var(--bw-sm) solid var(--border);
  white-space: nowrap;
}

.admin-table th {
  font-size: var(--fs-small);
  letter-spacing: 0.06em;
  color: var(--ink-faint);
  font-weight: var(--fw-semibold);
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.issue-link {
  color: var(--ink);
  max-width: 16rem;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}

.issue-link:hover {
  color: var(--clay);
}

.content-cell {
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-muted);
}

.state-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-size: 0.78rem;
  font-weight: var(--fw-semibold);
  border: var(--bw-sm) solid transparent;
}

.state-normal {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
  border-color: rgba(102, 153, 135, 0.32);
}

.state-deleted {
  background: var(--gray-200);
  color: var(--gray-600);
  border-color: var(--border-strong);
}

.muted {
  color: var(--ink-faint);
}
</style>
