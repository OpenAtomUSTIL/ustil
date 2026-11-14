<script setup lang="ts">
/* 在线用户：GET /admin/online-users?minutes=15，minutes 1-1440 可调 + 刷新 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { OnlineUsersResult } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
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

    <form class="admin-filters" role="search" @submit.prevent="load">
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
    <LoadingState v-else-if="loading" />
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
            <td><span class="role-badge" :data-role="item.role">{{ roleLabel(item.role) }}</span></td>
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
/* 业务独有：标签与数字输入同行排布（全局 .admin-filters .field 为纵向） */
.admin-filters .field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.minutes-label {
  font-size: var(--fs-small);
  color: var(--ink-muted);
  white-space: nowrap;
}

/* 业务独有：分钟数输入为紧凑数字框，覆盖全局 min-width */
.admin-filters input {
  width: 7rem;
  min-width: 0;
}
</style>
