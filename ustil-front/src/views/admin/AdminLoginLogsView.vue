<script setup lang="ts">
/* 登录日志：GET /admin/login-logs；邮箱输入 + 结果下拉过滤，success 绿/红徽章 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { Page, LoginLogItem } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { KEYWORD_MAX } from '@/utils/limits'
import { formatDateTime } from '@/utils/format'

const emailFilter = ref('')
const successFilter = ref<'' | 'true' | 'false'>('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<LoginLogItem> | null>(null)
const loading = ref(true)
const error = ref('')

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listLoginLogs({
      page: page.value,
      pageSize,
      email: emailFilter.value.trim() || undefined,
      success: successFilter.value === '' ? undefined : successFilter.value === 'true',
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
  emailFilter.value = ''
  successFilter.value = ''
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
      <h2>登录日志</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 条</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent="search">
      <div class="field">
        <input
          v-model="emailFilter"
          type="search"
          placeholder="邮箱"
          aria-label="邮箱"
          :maxlength="KEYWORD_MAX"
        >
      </div>
      <div class="field">
        <select v-model="successFilter" aria-label="登录结果">
          <option value="">全部结果</option>
          <option value="true">成功</option>
          <option value="false">失败</option>
        </select>
      </div>
      <button class="btn btn-secondary" type="submit">搜索</button>
      <button class="btn btn-ghost" type="button" @click="reset">重置</button>
    </form>

    <div v-if="error" class="state-box">
      <p class="form-error">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="没有匹配的日志" hint="换个筛选条件试试" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>邮箱</th>
            <th>用户 ID</th>
            <th>IP</th>
            <th>UA</th>
            <th>结果</th>
            <th>失败原因</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in data.items" :key="log.id">
            <td>{{ formatDateTime(log.createdAt) }}</td>
            <td class="mono">{{ log.email ?? '—' }}</td>
            <td class="mono">{{ log.userId ?? '—' }}</td>
            <td class="mono">{{ log.ip }}</td>
            <td class="ua" :title="log.userAgent">{{ log.userAgent }}</td>
            <td>
              <span class="result-badge" :class="log.success ? 'result-ok' : 'result-fail'">
                {{ log.success ? '成功' : '失败' }}
              </span>
            </td>
            <td class="fail-reason">{{ log.failReason ?? '—' }}</td>
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

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
}

.ua,
.fail-reason {
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-muted);
}

.result-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-size: 0.78rem;
  font-weight: var(--fw-semibold);
  border: var(--bw-sm) solid transparent;
}

.result-ok {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
  border-color: rgba(102, 153, 135, 0.32);
}

.result-fail {
  background: rgba(191, 77, 67, 0.12);
  color: var(--error);
  border-color: rgba(191, 77, 67, 0.35);
}
</style>
