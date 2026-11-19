<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi, usersApi } from '@/api/request'
import type { AdminUser, Page, UpdateUserRoleRequest } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDate, roleLabel } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

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
const pendingDelete = ref<AdminUser | null>(null)

const ROLE_OPTIONS: UpdateUserRoleRequest['role'][] = ['VISITOR', 'MEMBER', 'ALUMNI', 'WHEEL']

/** 用户分类（角色）chips + 命中数，替代原角色下拉 */
const ROLE_CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'VISITOR', label: '临时访客' },
  { value: 'MEMBER', label: '学习成员' },
  { value: 'ALUMNI', label: '校友' },
  { value: 'WHEEL', label: '负责人' },
  { value: 'ADMIN', label: '管理员' },
]
const roleCounts = ref<Record<string, number | null>>({})
let countsVersion = 0

function countOf(value: string): number | null {
  return roleCounts.value[value] ?? null
}

/** 分类命中数：与列表同口径（keyword + 状态过滤），仅角色维度变化；单条失败置 null 不拖垮整排 */
async function loadCounts(): Promise<void> {
  const version = ++countsVersion
  const keywordValue = keyword.value.trim() || undefined
  const statusValue = statusFilter.value || undefined
  const settled = await Promise.allSettled(
    ROLE_CATEGORIES.map((cat) =>
      adminApi.listUsers({
        page: 1,
        pageSize: 1,
        keyword: keywordValue,
        role: cat.value || undefined,
        status: statusValue,
      }),
    ),
  )
  if (version !== countsVersion) return
  const next: Record<string, number | null> = {}
  ROLE_CATEGORIES.forEach((cat, index) => {
    const result = settled[index]
    next[cat.value] = result.status === 'fulfilled' ? result.value.total : null
  })
  roleCounts.value = next
}

/** 分类切换即刷列表（keyword / 状态仍由表单提交生效） */
function selectRole(value: string): void {
  if (roleFilter.value === value) return
  roleFilter.value = value
  page.value = 1
  void load()
}

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listUsers({
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined,
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
  void loadCounts()
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
    void loadCounts()
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
  // 失败时下拉框必须显示服务器仍然保存的角色。
  select.value = user.role
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
  pendingDelete.value = user
}

function confirmRemove(): void {
  const user = pendingDelete.value
  if (!user) return
  pendingDelete.value = null
  void runAction(user.id, () => adminApi.deleteUser(user.id), '已剔除')
}

onMounted(() => {
  void load()
  void loadCounts()
})
</script>

<template>
  <div>
    <div class="section-head">
      <h2>用户管理</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 人</span>
    </div>

    <form class="admin-filters" role="search" @submit.prevent="search">
      <div class="field">
        <input v-model="keyword" type="search" :maxlength="KEYWORD_MAX" placeholder="搜索昵称 / 用户名 / 邮箱 / 手机号">
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

    <div class="filter-bar" role="tablist" aria-label="用户分类">
      <button
        v-for="cat in ROLE_CATEGORIES"
        :key="cat.value"
        class="chip"
        :class="{ active: roleFilter === cat.value }"
        type="button"
        role="tab"
        :aria-selected="roleFilter === cat.value"
        @click="selectRole(cat.value)"
      >
        {{ cat.label }}<span v-if="countOf(cat.value) !== null" class="n">{{ countOf(cat.value) }}</span>
      </button>
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>
    <LoadingState v-else-if="loading" />
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
              <span class="badge badge-role" :data-role="user.role">{{ roleLabel(user.role) }}</span>
            </td>
            <td>
              <span class="badge" :class="user.status === 'BANNED' ? 'badge-error' : 'badge-mineral'">
                {{ user.status === 'BANNED' ? '已封禁' : '正常' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <div class="ops">
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
                <button v-if="auth.isAdmin && user.role !== 'ADMIN'" class="btn btn-sm btn-ghost" type="button" :disabled="busyId === user.id" @click="toggleBan(user)">
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

                <span v-if="!((auth.isAdmin && user.role !== 'ADMIN') || user.role === 'MEMBER' || user.role === 'VISITOR')" class="hint">无可用操作</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <BasePagination :page="page" :page-size="pageSize" :total="data.total" @change="changePage" />
    </div>

    <ConfirmModal
      v-if="pendingDelete"
      title="剔除用户"
      :message="`确定剔除「${pendingDelete.nickname}」？该账号及其讨论、提交、发布的文章/公告/资料/作业将被删除（含回收站中的），不可恢复；其发布且已有他人提交的作业会转由你继续发布。`"
      confirm-text="剔除"
      @confirm="confirmRemove"
      @cancel="pendingDelete = null"
    />
  </div>
</template>
