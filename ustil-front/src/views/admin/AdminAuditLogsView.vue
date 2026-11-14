<script setup lang="ts">
/* 操作日志：GET /admin/audit-logs，createdAt desc；action / targetType / actorId 过滤 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { AuditLogItem, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import LogDetailModal from '@/components/LogDetailModal.vue'
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
const detailLog = ref<AuditLogItem | null>(null)

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
            <td :title="log.createdAt">{{ formatDateTime(log.createdAt) }}</td>
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
              <button class="btn btn-sm btn-ghost" type="button" @click="detailLog = log">详情</button>
            </td>
          </tr>
        </tbody>
      </table>

      <BasePagination :page="page" :page-size="pageSize" :total="data.total" @change="changePage" />
    </div>

    <LogDetailModal
      v-if="detailLog"
      title="操作日志详情"
      :fields="[
        { label: '时间', value: formatDateTime(detailLog.createdAt) },
        { label: '操作人', value: detailLog.actorEmail ?? '' },
        { label: '操作人 ID', value: detailLog.actorId, mono: true },
        { label: '动作', value: detailLog.action, mono: true },
        { label: '目标类型', value: detailLog.targetType },
        { label: '目标 ID', value: detailLog.targetId ?? '', mono: true },
      ]"
      :json="detailLog.detail"
      json-label="变更明细"
      @close="detailLog = null"
    />
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
</style>
