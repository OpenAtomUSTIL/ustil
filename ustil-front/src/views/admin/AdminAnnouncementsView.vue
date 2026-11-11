<script setup lang="ts">
/* 公告管理：列表 + 新建/编辑表单（AnnouncementForm）+ 删除确认 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { announcementsApi } from '@/api/request'
import type {
  AnnouncementCreateRequest,
  AnnouncementItem,
  AnnouncementUpdateRequest,
  Page,
} from '@/api/types'
import AnnouncementForm from '@/components/AnnouncementForm.vue'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const toast = useToastStore()

const data = ref<Page<AnnouncementItem> | null>(null)
const loading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 20

const formOpen = ref(false)
const editing = ref<AnnouncementItem | null>(null)
const saving = ref(false)
const formError = ref('')
const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await announcementsApi.list({ page: page.value, pageSize })
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function changePage(next: number): void {
  page.value = next
  void load()
}

function openCreate(): void {
  editing.value = null
  formError.value = ''
  formOpen.value = true
}

function openEdit(item: AnnouncementItem): void {
  editing.value = item
  formError.value = ''
  formOpen.value = true
}

function closeForm(): void {
  formOpen.value = false
  editing.value = null
  formError.value = ''
}

async function submitForm(
  payload: AnnouncementCreateRequest | AnnouncementUpdateRequest,
): Promise<void> {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await announcementsApi.update(editing.value.id, payload)
      toast.show('公告已更新')
    } else {
      await announcementsApi.create(payload as AnnouncementCreateRequest)
      toast.show('公告已发布')
    }
    closeForm()
    await load()
  } catch (err) {
    // 保存失败保留输入，只展示原因
    formError.value = describeError(err)
  } finally {
    saving.value = false
  }
}

async function remove(id: string): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  try {
    await announcementsApi.remove(id)
    toast.show('已移入回收站')
    confirmDeleteId.value = null
    if (data.value && data.value.items.length === 1 && page.value > 1) page.value -= 1
    await load()
  } catch (err) {
    confirmDeleteId.value = null
    toast.show(describeError(err))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>公告管理</h2>
      <button v-if="!formOpen" class="btn btn-clay" type="button" @click="openCreate">新建公告</button>
    </div>

    <AnnouncementForm
      v-if="formOpen"
      class="inline-form"
      :mode="editing ? 'edit' : 'create'"
      :initial="editing ? { title: editing.title, content: editing.content, pinned: editing.pinned } : undefined"
      :busy="saving"
      :error="formError"
      @submit="submitForm"
      @cancel="closeForm"
    />

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="还没有公告" hint="点击右上角「新建公告」发布第一条。" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>置顶</th>
            <th>作者</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td>
              <RouterLink class="title-link" :to="{ name: 'announcement-detail', params: { id: item.id } }">
                {{ item.title }}
              </RouterLink>
            </td>
            <td>
              <span class="badge" :class="item.pinned ? 'badge-state-open' : 'badge-closed'">
                {{ item.pinned ? '置顶' : '普通' }}
              </span>
            </td>
            <td>{{ item.authorName }}</td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td>{{ formatDateTime(item.updatedAt) }}</td>
            <td class="ops">
              <button class="btn btn-sm btn-secondary" type="button" @click="openEdit(item)">编辑</button>
              <template v-if="confirmDeleteId === item.id">
                <button class="btn btn-sm btn-danger" type="button" :disabled="deleting" @click="remove(item.id)">
                  {{ deleting ? '删除中…' : '确认删除？' }}
                </button>
                <button class="btn btn-sm btn-ghost" type="button" :disabled="deleting" @click="confirmDeleteId = null">
                  取消
                </button>
                <span class="rm-hint">删除后可在后台回收站恢复</span>
              </template>
              <button v-else class="btn btn-sm btn-ghost" type="button" @click="confirmDeleteId = item.id">
                删除
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
.inline-form {
  margin-bottom: 1.75rem;
  padding: 1.35rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-16);
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

.title-link {
  font-weight: var(--fw-medium);
  color: var(--ink);
}

.title-link:hover {
  color: var(--clay-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.ops {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}
</style>
