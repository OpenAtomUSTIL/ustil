<script setup lang="ts">
/* 操作日志：GET /admin/audit-logs，createdAt desc；action / targetType / actorId 过滤 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { AuditLogItem, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDateTime } from '@/utils/format'

const TARGET_TYPES = ['USER', 'INVITE_CODE', 'ARTICLE', 'ASSIGNMENT', 'ANNOUNCEMENT', 'RESOURCE', 'ISSUE'] as const

const actionFilter = ref('')
const targetTypeFilter = ref('')
const actorIdFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<AuditLogItem> | null>(null)
const loading = ref(true)
const error = ref('')

function formatDetail(detail: Record<string, unknown> | null): string {
  return detail === null ? '' : JSON.stringify(detail, null, 2)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listAuditLogs({
      page: page.value,
      pageSize,
      action: actionFilter.value.trim() || undefined,
      targetType: targetTypeFilter.value || undefined,
      actorId: actorIdFilter.value.trim() || undefined,
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
  actionFilter.value = ''
  targetTypeFilter.value = ''
  actorIdFilter.value = ''
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
      <h2>操作日志</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 条</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent="search">
      <div class="field">
        <input v-model="actionFilter" type="search" placeholder="动作，如 user.role.change" aria-label="动作">
      </div>
      <div class="field">
        <select v-model="targetTypeFilter" aria-label="目标类型">
          <option value="">全部目标类型</option>
          <option v-for="t in TARGET_TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div class="field">
        <input v-model="actorIdFilter" type="search" placeholder="操作人 ID" aria-label="操作人 ID">
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
            <th>操作人</th>
            <th>动作</th>
            <th>目标类型</th>
            <th>目标 ID</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in data.items" :key="log.id">
            <td>{{ formatDateTime(log.createdAt) }}</td>
            <td>
              <div class="actor">
                <span>{{ log.actorEmail }}</span>
                <span class="mono sub">{{ log.actorId }}</span>
              </div>
            </td>
            <td><code class="action">{{ log.action }}</code></td>
            <td><span class="badge badge-role">{{ log.targetType }}</span></td>
            <td class="mono">{{ log.targetId }}</td>
            <td>
              <details v-if="log.detail !== null" class="detail-fold">
                <summary>查看</summary>
                <pre>{{ formatDetail(log.detail) }}</pre>
              </details>
              <span v-else class="sub">—</span>
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
  vertical-align: top;
}

.admin-table th {
  font-size: var(--fs-small);
  letter-spacing: 0.06em;
  color: var(--ink-faint);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
  font-size: 0.78rem;
}

.actor {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.actor .sub {
  font-size: 0.72rem;
}

.action {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  background: var(--gray-150);
  padding: 0.12rem 0.45rem;
  border-radius: var(--br-4);
  color: var(--gray-700);
}

.sub {
  color: var(--ink-faint);
}

.detail-fold summary {
  cursor: pointer;
  color: var(--clay-dark);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  list-style: none;
}

.detail-fold summary::-webkit-details-marker {
  display: none;
}

.detail-fold summary::before {
  content: '▸ ';
}

.detail-fold[open] summary::before {
  content: '▾ ';
}

.detail-fold pre {
  margin: 0.55rem 0 0.2rem;
  padding: 0.75rem 0.9rem;
  background: var(--gray-100);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  max-width: 28rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
