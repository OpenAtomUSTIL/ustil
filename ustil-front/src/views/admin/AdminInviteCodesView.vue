<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { InviteCode, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, timeAgo } from '@/utils/format'

const toast = useToastStore()

const count = ref(1)
const maxUses = ref(1)
const expiresAt = ref('')
const generating = ref(false)
const generateError = ref('')
const newCodes = ref<string[]>([])

const statusFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<InviteCode> | null>(null)
const loading = ref(true)
const error = ref('')
const busyId = ref('')
const confirmRevokeId = ref<string | null>(null)
const counts = ref<{ all: number | null; active: number | null; revoked: number | null }>({
  all: null,
  active: null,
  revoked: null,
})

async function loadCounts(): Promise<void> {
  try {
    const [all, active, revoked] = await Promise.all([
      adminApi.listInviteCodes({ page: 1, pageSize: 1 }),
      adminApi.listInviteCodes({ page: 1, pageSize: 1, status: 'ACTIVE' }),
      adminApi.listInviteCodes({ page: 1, pageSize: 1, status: 'REVOKED' }),
    ])
    counts.value = { all: all.total, active: active.total, revoked: revoked.total }
  } catch {
    counts.value = { all: null, active: null, revoked: null }
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listInviteCodes({
      page: page.value,
      pageSize,
      status: statusFilter.value || undefined,
    })
    void loadCounts()
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

function statusOf(item: InviteCode): { label: string; cls: string } {
  if (item.status === 'REVOKED') return { label: '已作废', cls: 'badge-closed' }
  if (item.remaining <= 0) return { label: '已用尽', cls: 'badge-hold' }
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) {
    return { label: '已过期', cls: 'badge-not-started' }
  }
  return { label: '生效中', cls: 'badge-answered' }
}

function usagePct(item: InviteCode): number {
  if (item.maxUses <= 0) return 0
  return Math.min(100, Math.round((item.usedCount / item.maxUses) * 100))
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
    newCodes.value = result.items.map((item) => item.code)
    toast.show(`已生成 ${result.items.length} 个邀请码`)
    page.value = 1
    await load()
  } catch (err) {
    generateError.value = describeError(err)
  } finally {
    generating.value = false
  }
}

async function copyText(text: string, okMessage = '已复制'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.show(okMessage)
  } catch {
    toast.show('复制失败，请手动选择复制')
  }
}

async function copyAll(): Promise<void> {
  await copyText(newCodes.value.join('\n'), `已复制 ${newCodes.value.length} 个邀请码`)
}

async function revoke(item: InviteCode): Promise<void> {
  if (busyId.value) return
  busyId.value = item.id
  try {
    await adminApi.revokeInviteCode(item.id)
    toast.show('已作废')
    confirmRevokeId.value = null
    await load()
  } catch (err) {
    confirmRevokeId.value = null
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

    <section class="gen-card">
      <header class="gen-head">
        <h3>批量生成</h3>
        <p class="hint">一个邀请码可限制被邀请人数，用尽、过期或作废后即失效。</p>
      </header>

      <form class="gen-form" @submit.prevent="generate">
        <div class="field">
          <label for="ic-count">生成个数</label>
          <input id="ic-count" v-model.number="count" type="number" min="1" max="50" required>
        </div>

        <div class="field">
          <label for="ic-max">每码可用人数</label>
          <input id="ic-max" v-model.number="maxUses" type="number" min="1" max="100" required>
        </div>

        <div class="field">
          <label for="ic-exp">过期时间</label>
          <input id="ic-exp" v-model="expiresAt" type="datetime-local">
        </div>

        <button class="btn btn-clay" type="submit" :disabled="generating">
          {{ generating ? '生成中…' : '生成邀请码' }}
        </button>

        <span class="row-hint">过期时间留空为永久有效</span>

        <div v-if="generateError" class="form-error">{{ generateError }}</div>
      </form>

      <div v-if="newCodes.length" class="gen-result">
        <div class="gen-result-head">
          <strong>刚生成 {{ newCodes.length }} 个邀请码</strong>
          <div class="gen-result-ops">
            <button class="btn btn-sm btn-secondary" type="button" @click="copyAll">复制全部</button>
            <button class="btn btn-sm btn-ghost" type="button" @click="newCodes = []">收起</button>
          </div>
        </div>
        <ul class="code-grid">
          <li v-for="code in newCodes" :key="code">
            <code>{{ code }}</code>
            <button class="btn btn-sm btn-ghost" type="button" @click="copyText(code)">复制</button>
          </li>
        </ul>
      </div>
    </section>

    <div class="filter-bar">
      <button
        class="chip"
        :class="{ active: statusFilter === '' }"
        type="button"
        @click="statusFilter = ''; search()"
      >
        全部<span v-if="counts.all !== null" class="n">{{ counts.all }}</span>
      </button>
      <button
        class="chip"
        :class="{ active: statusFilter === 'ACTIVE' }"
        type="button"
        @click="statusFilter = 'ACTIVE'; search()"
      >
        生效中<span v-if="counts.active !== null" class="n">{{ counts.active }}</span>
      </button>
      <button
        class="chip"
        :class="{ active: statusFilter === 'REVOKED' }"
        type="button"
        @click="statusFilter = 'REVOKED'; search()"
      >
        已作废<span v-if="counts.revoked !== null" class="n">{{ counts.revoked }}</span>
      </button>
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState
      v-else-if="!data || data.items.length === 0"
      title="还没有邀请码"
      hint="用上方「批量生成」创建第一批邀请码"
    />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>邀请码</th>
            <th>状态</th>
            <th class="usage-col">用量</th>
            <th>过期时间</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td>
              <div class="code-cell">
                <code>{{ item.code }}</code>
                <button
                  class="btn btn-sm btn-ghost"
                  type="button"
                  title="复制邀请码"
                  @click="copyText(item.code)"
                >
                  复制
                </button>
              </div>
            </td>
            <td>
              <span class="badge" :class="statusOf(item).cls">{{ statusOf(item).label }}</span>
            </td>
            <td class="usage-col">
              <span class="mono">{{ item.usedCount }} / {{ item.maxUses }}</span>
              <div class="progress">
                <div class="bar" :style="{ width: usagePct(item) + '%' }" />
              </div>
            </td>
            <td>
              <span>{{ item.expiresAt ? formatDateTime(item.expiresAt) : '永久有效' }}</span>
              <div v-if="item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()" class="hint">
                已过期
              </div>
            </td>
            <td>
              <span>{{ formatDateTime(item.createdAt) }}</span>
              <div class="hint">{{ timeAgo(item.createdAt) }}</div>
            </td>
            <td class="ops">
              <template v-if="confirmRevokeId === item.id">
                <button
                  class="btn btn-sm btn-danger"
                  type="button"
                  :disabled="busyId === item.id"
                  @click="revoke(item)"
                >
                  {{ busyId === item.id ? '作废中…' : '确认作废？' }}
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  type="button"
                  :disabled="busyId === item.id"
                  @click="confirmRevokeId = null"
                >
                  取消
                </button>
                <span class="rm-hint">作废后不可恢复</span>
              </template>
              <button
                v-else-if="item.status === 'ACTIVE'"
                class="btn btn-sm btn-danger"
                type="button"
                @click="confirmRevokeId = item.id"
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
.gen-card {
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  padding: 1.15rem 1.25rem 1.25rem;
  margin-bottom: 1.35rem;
}

.gen-head {
  margin-bottom: 1rem;
}

.gen-head h3 {
  font-size: var(--fs-h3, 1.05rem);
  letter-spacing: -0.01em;
  margin-bottom: 0.25rem;
}

.gen-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.15rem;
}

.gen-form .field {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
}

.gen-form label {
  font-size: var(--fs-small);
  color: var(--ink-muted);
  white-space: nowrap;
}

.gen-form input {
  padding: 0.45rem 0.65rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-sunken);
  font-size: var(--fs-meta);
}

.gen-form input:focus {
  outline: none;
  border-color: var(--gray-400);
}

.gen-form input[type='number'] {
  width: 5.5rem;
}

.gen-form input[type='datetime-local'] {
  width: 13.5rem;
}

.row-hint {
  font-size: var(--fs-small);
  color: var(--ink-faint);
}

.gen-form .form-error {
  flex-basis: 100%;
  margin: 0;
}

.gen-result {
  margin-top: 1.15rem;
  padding: 0.95rem 1rem;
  border: var(--bw-sm) dashed var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-sunken);
}

.gen-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.gen-result-head strong {
  font-size: var(--fs-meta);
}

.gen-result-ops {
  display: flex;
  gap: 0.45rem;
}

.code-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 0.45rem;
}

.code-grid li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.55rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
}

.code-grid code {
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.06em;
  font-size: var(--fs-meta);
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

.admin-table tbody tr {
  transition: background var(--t-fast, 120ms) ease;
}

.admin-table tbody tr:hover {
  background: var(--bg-sunken);
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.code-cell {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.code-cell code {
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.08em;
  font-weight: var(--fw-semibold);
}

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
}

.usage-col {
  min-width: 8.5rem;
}

.usage-col .progress {
  width: 7.5rem;
  margin-top: 0.45rem;
}

.ops {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}
</style>
