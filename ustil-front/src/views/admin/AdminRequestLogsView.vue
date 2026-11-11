<script setup lang="ts">
/* 接口日志：GET /admin/request-logs，createdAt desc；method 下拉 + 用户 ID 过滤 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { Page, RequestLogItem } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDateTime } from '@/utils/format'

const METHOD_OPTIONS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const

const methodFilter = ref('')
const userIdFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<RequestLogItem> | null>(null)
const loading = ref(true)
const error = ref('')

function statusClass(code: number): string {
  if (code >= 500) return 'status-5xx'
  if (code >= 400) return 'status-4xx'
  if (code >= 200) return 'status-2xx'
  return 'status-other'
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listRequestLogs({
      page: page.value,
      pageSize,
      method: methodFilter.value || undefined,
      userId: userIdFilter.value.trim() || undefined,
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
  methodFilter.value = ''
  userIdFilter.value = ''
  search()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>接口日志</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 条</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent="search">
      <div class="field">
        <select v-model="methodFilter" aria-label="请求方法">
          <option value="">全部方法</option>
          <option v-for="m in METHOD_OPTIONS" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="field">
        <input v-model="userIdFilter" type="search" placeholder="用户 ID" aria-label="用户 ID">
      </div>
      <button class="btn btn-secondary" type="submit">搜索</button>
      <button class="btn btn-ghost" type="button" @click="reset">重置</button>
    </form>

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="没有匹配的日志" hint="换个筛选条件试试" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>方法</th>
            <th>路径</th>
            <th>状态码</th>
            <th>用户</th>
            <th>IP</th>
            <th>耗时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in data.items" :key="log.id">
            <td>{{ formatDateTime(log.createdAt) }}</td>
            <td><span class="method" :data-method="log.method">{{ log.method }}</span></td>
            <td class="path">{{ log.path }}</td>
            <td>
              <span class="status-code" :class="statusClass(log.statusCode)">{{ log.statusCode }}</span>
            </td>
            <td class="mono">{{ log.userEmail ?? '—' }}</td>
            <td class="mono">{{ log.ip }}</td>
            <td class="mono">{{ log.durationMs }} ms</td>
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

.filter-bar input,
.filter-bar select {
  min-width: 11rem;
  padding: 0.5rem 0.75rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-raised);
  font-size: var(--fs-meta);
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

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
}

.path {
  font-family: var(--font-mono);
  font-size: 0.82em;
  color: var(--ink-muted);
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.method {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: var(--fw-semibold);
  background: var(--gray-200);
  color: var(--gray-700);
}

.method[data-method='GET'] {
  background: rgba(106, 155, 204, 0.13);
  color: var(--sky);
}

.method[data-method='POST'] {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
}

.method[data-method='PATCH'],
.method[data-method='PUT'] {
  background: rgba(217, 119, 87, 0.12);
  color: var(--clay-dark);
}

.method[data-method='DELETE'] {
  background: rgba(191, 77, 67, 0.12);
  color: var(--error);
}

.status-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.6rem;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: var(--fw-semibold);
  border: var(--bw-sm) solid transparent;
}

.status-2xx {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
  border-color: rgba(102, 153, 135, 0.32);
}

.status-4xx {
  background: rgba(217, 119, 87, 0.12);
  color: var(--clay-dark);
  border-color: rgba(217, 119, 87, 0.3);
}

.status-5xx {
  background: rgba(191, 77, 67, 0.12);
  color: var(--error);
  border-color: rgba(191, 77, 67, 0.35);
}

.status-other {
  background: var(--gray-200);
  color: var(--gray-600);
  border-color: var(--border-strong);
}
</style>
