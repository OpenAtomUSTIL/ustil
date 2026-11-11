<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { InviteCode, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const toast = useToastStore()

const count = ref(1)
const maxUses = ref(1)
const expiresAt = ref('')
const generating = ref(false)
const generateError = ref('')

const statusFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<InviteCode> | null>(null)
const loading = ref(true)
const error = ref('')
const busyId = ref('')

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listInviteCodes({
      page: page.value,
      pageSize,
      status: statusFilter.value || undefined,
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

function changePage(next: number): void {
  page.value = next
  void load()
}

async function generate(): Promise<void> {
  if (generating.value) return
  generating.value = true
  generateError.value = ''
  try {
    const result = await adminApi.generateInviteCodes({
      count: count.value,
      maxUses: maxUses.value,
      expiresAt: expiresAt.value ? new Date(expiresAt.value).toISOString() : undefined,
    })
    toast.show(`已生成 ${result.items.length} 个邀请码`)
    page.value = 1
    await load()
  } catch (err) {
    generateError.value = describeError(err)
  } finally {
    generating.value = false
  }
}

async function copy(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code)
    toast.show('已复制')
  } catch {
    toast.show('复制失败，请手动选择复制')
  }
}

async function revoke(item: InviteCode): Promise<void> {
  if (!window.confirm(`确定作废邀请码 ${item.code}？作废后不可恢复。`)) return
  if (busyId.value) return
  busyId.value = item.id
  try {
    await adminApi.revokeInviteCode(item.id)
    toast.show('已作废')
    await load()
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    busyId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>邀请码</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 个</span>
    </div>

    <form class="gen-form" @submit.prevent="generate">
      <div class="field">
        <label for="ic-count">生成个数</label>
        <input id="ic-count" v-model.number="count" type="number" min="1" max="50" required>
      </div>
      <div class="field">
        <label for="ic-max">每码可用人数</label>
        <input id="ic-max" v-model.number="maxUses" type="number" min="1" max="100" required>
        <span class="hint">一个邀请码可邀请多名成员，用尽即失效</span>
      </div>
      <div class="field">
        <label for="ic-exp">过期时间（可选）</label>
        <input id="ic-exp" v-model="expiresAt" type="datetime-local">
      </div>
      <button class="btn btn-clay" type="submit" :disabled="generating">
        {{ generating ? '生成中…' : '生成邀请码' }}
      </button>
      <div v-if="generateError" class="form-error">{{ generateError }}</div>
    </form>

    <div class="filter-bar">
      <button
        class="chip"
        :class="{ active: statusFilter === '' }"
        type="button"
        @click="statusFilter = ''; search()"
      >
        全部
      </button>
      <button
        class="chip"
        :class="{ active: statusFilter === 'ACTIVE' }"
        type="button"
        @click="statusFilter = 'ACTIVE'; search()"
      >
        生效中
      </button>
      <button
        class="chip"
        :class="{ active: statusFilter === 'REVOKED' }"
        type="button"
        @click="statusFilter = 'REVOKED'; search()"
      >
        已作废
      </button>
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="还没有邀请码" hint="用上方表单批量生成" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>邀请码</th>
            <th>状态</th>
            <th>已用 / 上限</th>
            <th>过期时间</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td class="code-cell">{{ item.code }}</td>
            <td>
              <span class="badge" :class="item.status === 'REVOKED' ? 'badge-closed' : 'badge-answered'">
                {{ item.status === 'REVOKED' ? '已作废' : item.remaining > 0 ? '生效中' : '已用尽' }}
              </span>
            </td>
            <td class="mono">{{ item.usedCount }} / {{ item.maxUses }}</td>
            <td>{{ item.expiresAt ? formatDateTime(item.expiresAt) : '永久' }}</td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td class="ops">
              <button class="btn btn-sm btn-secondary" type="button" @click="copy(item.code)">复制</button>
              <button
                v-if="item.status === 'ACTIVE'"
                class="btn btn-sm btn-danger"
                type="button"
                :disabled="busyId === item.id"
                @click="revoke(item)"
              >
                作废
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
.gen-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: end;
  padding: 1.15rem 1.25rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  margin-bottom: 1.35rem;
}

.gen-form .field {
  margin: 0;
  min-width: 11rem;
}

.gen-form input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-sunken);
  font-size: var(--fs-meta);
}

.gen-form .form-error {
  flex-basis: 100%;
  margin: 0;
}

.filter-bar {
  display: flex;
  gap: 0.55rem;
  margin-bottom: 1.15rem;
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

.code-cell {
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.08em;
  font-weight: var(--fw-semibold);
}

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
}

.ops {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}
</style>
