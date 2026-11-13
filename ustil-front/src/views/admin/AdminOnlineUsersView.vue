<script setup lang="ts">
/* 在线用户：GET /admin/online-users?minutes=15，minutes 1-1440 可调 + 刷新 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { OnlineUsersResult } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import { formatDateTime, roleLabel, timeAgo } from '@/utils/format'

const MIN_MINUTES = 1
const MAX_MINUTES = 1440

const minutesInput = ref(15)
const data = ref<OnlineUsersResult | null>(null)
const loading = ref(true)
const error = ref('')

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  const minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutesInput.value) || MIN_MINUTES))
  minutesInput.value = minutes
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.getOnlineUsers(minutes)
    if (version !== loadVersion) return
    data.value = result
  } catch (err) {
    if (version !== loadVersion) return
    error.value = describeError(err)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>在线用户</h2>
      <span v-if="data" class="hint">最近 {{ data.minutes }} 分钟活跃 {{ data.total }} 人</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent="load">
      <div class="field">
        <label class="minutes-label" for="online-minutes">活跃窗口（分钟）</label>
        <input
          id="online-minutes"
          v-model.number="minutesInput"
          type="number"
          :min="MIN_MINUTES"
          :max="MAX_MINUTES"
          step="1"
        >
      </div>
      <button class="btn btn-secondary" type="submit">刷新</button>
    </form>

    <div v-if="error" class="state-box">
      <p class="form-error">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState
      v-else-if="!data || data.items.length === 0"
      title="当前没有在线用户"
      :hint="`最近 ${data?.minutes ?? minutesInput} 分钟内没有活跃记录`"
    />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>昵称</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>最后活跃</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.userId">
            <td>{{ item.nickname }}</td>
            <td class="mono">{{ item.email ?? '—' }}</td>
            <td><span class="role-badge">{{ roleLabel(item.role) }}</span></td>
            <td>
              <span :title="formatDateTime(item.lastSeenAt)">{{ timeAgo(item.lastSeenAt) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.minutes-label {
  font-size: var(--fs-small);
  color: var(--ink-muted);
  white-space: nowrap;
}

.filter-bar input {
  width: 7rem;
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

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-size: 0.78rem;
  font-weight: var(--fw-semibold);
  background: var(--gray-200);
  color: var(--gray-700);
}
</style>
