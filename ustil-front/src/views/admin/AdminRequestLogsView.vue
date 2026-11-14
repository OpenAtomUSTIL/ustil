<script setup lang="ts">
/* 接口日志：GET /admin/request-logs，createdAt desc；method 下拉 + 用户 ID 过滤 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { Page, RequestLogItem } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import LogDetailModal from '@/components/LogDetailModal.vue'
import { formatDateTime } from '@/utils/format'

const METHOD_OPTIONS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const

const methodFilter = ref('')
const userIdFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<RequestLogItem> | null>(null)
const loading = ref(true)
const error = ref('')
const detailLog = ref<RequestLogItem | null>(null)

function methodBadge(method: string): string {
  switch (method) {
    case 'GET': return 'badge-sky'
    case 'POST': return 'badge-mineral'
    case 'PATCH':
    case 'PUT': return 'badge-clay'
    case 'DELETE': return 'badge-error'
    default: return 'badge-gray'
  }
}

function statusClass(code: number): string {
  if (code >= 500) return 'badge-error'
  if (code >= 400) return 'badge-clay'
  if (code >= 300) return 'badge-sky'
  if (code >= 200) return 'badge-mineral'
  return 'badge-gray'
}

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listRequestLogs({
      page: page.value,
      pageSize,
      method: methodFilter.value || undefined,
      userId: userIdFilter.value.trim() || undefined,
    })
    if (version !== loadVersion) return
    data.value = result
    const lastPage = Math.max(1, Math.ceil(data.value.total / pageSize))
    if (page.value > lastPage) {
      page.value = lastPage
      await load()
      return
    }
  } catch (err) {
    if (version !== loadVersion) return
    error.value = describeError(err)
  } finally {
    if (version === loadVersion) loading.value = false
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

    <form class="admin-filters" role="search" @submit.prevent="search">
      <div class="field">
        <select v-model="methodFilter" aria-label="请求方法">
          <option value="">全部方法</option>
          <option v-for="m in METHOD_OPTIONS" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="field">
        <input v-model="userIdFilter" type="search" placeholder="UUID / 邮箱 / 用户名 / 手机号" aria-label="UUID / 邮箱 / 用户名 / 手机号">
      </div>
      <button class="btn btn-secondary" type="submit">搜索</button>
      <button class="btn btn-ghost" type="button" @click="reset">重置</button>
    </form>

    <div v-if="error" class="form-error">{{ error }}</div>
    <LoadingState v-else-if="loading" />
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
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in data.items" :key="log.id">
            <td :title="log.createdAt">{{ formatDateTime(log.createdAt) }}</td>
            <td><span class="badge" :class="methodBadge(log.method)">{{ log.method }}</span></td>
            <td class="path" :title="log.path">{{ log.path }}</td>
            <td>
              <span class="badge status-code" :class="statusClass(log.statusCode)">{{ log.statusCode }}</span>
            </td>
            <td class="mono">{{ log.userEmail ?? '—' }}</td>
            <td class="mono">{{ log.ip }}</td>
            <td class="mono">{{ log.durationMs }} ms</td>
            <td>
              <button class="btn btn-sm btn-ghost" type="button" @click="detailLog = log">详情</button>
            </td>
          </tr>
        </tbody>
      </table>

      <BasePagination :page="page" :page-size="pageSize" :total="data.total" @change="changePage" />
    </div>

    <LogDetailModal
      v-if="detailLog"
      title="请求日志详情"
      :fields="[
        { label: '时间', value: formatDateTime(detailLog.createdAt) },
        { label: '方法', value: detailLog.method },
        { label: '路径', value: detailLog.path, mono: true },
        { label: '状态码', value: String(detailLog.statusCode) },
        { label: '耗时', value: `${detailLog.durationMs} ms` },
        { label: '用户', value: detailLog.userEmail ?? '' },
        { label: '用户 ID', value: detailLog.userId ?? '', mono: true },
        { label: 'IP', value: detailLog.ip, mono: true },
      ]"
      @close="detailLog = null"
    />
  </div>
</template>

<style scoped>
/* 业务独有：路径列 mono 截断 */
.path {
  font-family: var(--font-mono);
  font-size: 0.82em;
  color: var(--ink-muted);
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 业务需要：状态码列等宽居中（配色由 badge 色调类提供） */
.status-code {
  justify-content: center;
  min-width: 2.6rem;
}
</style>
