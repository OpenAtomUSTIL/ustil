<script setup lang="ts">
/* 操作日志：GET /admin/audit-logs，createdAt desc；action / targetType / actorId 过滤 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { AuditLogItem, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
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

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listAuditLogs({
      page: page.value,
      pageSize,
      action: actionFilter.value.trim() || undefined,
      targetType: targetTypeFilter.value || undefined,
      actorId: actorIdFilter.value.trim() || undefined,
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

    <form class="admin-filters" role="search" @submit.prevent="search">
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
        <input v-model="actorIdFilter" type="search" placeholder="UUID / 邮箱 / 用户名 / 手机号" aria-label="UUID / 邮箱 / 用户名 / 手机号">
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
            <td><span class="badge badge-plum">{{ log.targetType }}</span></td>
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
/* 业务需要：详情折叠块展开后行高变高，单元格顶对齐（全局为 middle） */
.admin-table td {
  vertical-align: top;
}

/* 业务需要：ID 类 mono 字号比全局 .mono 更小 */
.mono {
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
