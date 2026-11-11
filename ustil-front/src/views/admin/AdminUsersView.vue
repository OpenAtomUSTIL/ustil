<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi, usersApi } from '@/api/request'
import type { AdminUser, Page, UpdateUserRoleRequest } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDate, roleLabel } from '@/utils/format'

const auth = useAuthStore()
const toast = useToastStore()

const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<AdminUser> | null>(null)
const loading = ref(true)
const error = ref('')
const busyId = ref('')

const ROLE_OPTIONS: UpdateUserRoleRequest['role'][] = ['VISITOR', 'MEMBER', 'ALUMNI', 'WHEEL']

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listUsers({
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      role: roleFilter.value || undefined,
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

function reset(): void {
  keyword.value = ''
  roleFilter.value = ''
  statusFilter.value = ''
  search()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function runAction(id: string, action: () => Promise<unknown>, message: string): Promise<void> {
  if (busyId.value) return
  busyId.value = id
  try {
    await action()
    toast.show(message)
    await load()
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    busyId.value = ''
  }
}

function changeRole(user: AdminUser, event: Event): void {
  const select = event.target as HTMLSelectElement
  const role = select.value as UpdateUserRoleRequest['role']
  if (!role || role === user.role) return
  void runAction(user.id, () => adminApi.updateUserRole(user.id, { role }), '角色已更新')
}

function promote(user: AdminUser): void {
  void runAction(user.id, () => adminApi.promoteUser(user.id), '已提前提拔为校友')
}

function toggleBan(user: AdminUser): void {
  const banned = user.status === 'BANNED'
  void runAction(
    user.id,
    () => (banned ? usersApi.unban(user.id) : usersApi.ban(user.id)),
    banned ? '已解封' : '已封禁',
  )
}

function remove(user: AdminUser): void {
  if (!window.confirm(`确定剔除「${user.nickname}」？该账号及其讨论/提交将被删除，不可恢复。`)) return
  void runAction(user.id, () => adminApi.deleteUser(user.id), '已剔除')
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>用户管理</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 人</span>
    </div>

    <form class="filter-bar" role="search" @submit.prevent="search">
      <div class="field">
        <input v-model="keyword" type="search" placeholder="搜索昵称 / 邮箱 / 手机号">
      </div>
      <div class="field">
        <select v-model="roleFilter">
          <option value="">全部角色</option>
          <option value="VISITOR">临时访客</option>
          <option value="MEMBER">学习成员</option>
          <option value="ALUMNI">校友</option>
          <option value="WHEEL">负责人</option>
          <option value="ADMIN">管理员</option>
        </select>
      </div>
      <div class="field">
        <select v-model="statusFilter">
          <option value="">全部状态</option>
          <option value="ACTIVE">正常</option>
          <option value="BANNED">已封禁</option>
        </select>
      </div>
      <button class="btn btn-secondary" type="submit">搜索</button>
      <button class="btn btn-ghost" type="button" @click="reset">重置</button>
    </form>

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="没有匹配的用户" hint="换个筛选条件试试" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>昵称</th>
            <th>联系方式</th>
            <th>角色</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in data.items" :key="user.id">
            <td>{{ user.nickname }}</td>
            <td class="mono">{{ user.contact ?? '—' }}</td>
            <td>
              <span class="badge badge-role">{{ roleLabel(user.role) }}</span>
            </td>
            <td>
              <span class="badge" :class="user.status === 'BANNED' ? 'badge-closed' : 'badge-answered'">
                {{ user.status === 'BANNED' ? '已封禁' : '正常' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="ops">
              <select
                v-if="auth.isAdmin && user.role !== 'ADMIN'"
                class="role-select"
                :value="user.role"
                :disabled="busyId === user.id"
                aria-label="修改角色"
                @change="changeRole(user, $event)"
              >
                <option v-for="opt in ROLE_OPTIONS" :key="opt" :value="opt">{{ roleLabel(opt) }}</option>
              </select>
              <button
                v-if="user.role === 'MEMBER'"
                class="btn btn-sm btn-secondary"
                type="button"
                :disabled="busyId === user.id"
                @click="promote(user)"
              >
                提拔
              </button>
              <button class="btn btn-sm btn-ghost" type="button" :disabled="busyId === user.id" @click="toggleBan(user)">
                {{ user.status === 'BANNED' ? '解封' : '封禁' }}
              </button>
              <button
                v-if="user.role === 'MEMBER' || user.role === 'VISITOR'"
                class="btn btn-sm btn-danger"
                type="button"
                :disabled="busyId === user.id"
                @click="remove(user)"
              >
                剔除
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

.ops {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.role-select {
  padding: 0.32rem 0.5rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-sunken);
  font-size: var(--fs-small);
}
</style>
