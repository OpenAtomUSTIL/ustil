<script setup lang="ts">
/* 资源管理：列表 + 新建/编辑表单（ResourceForm）+ 删除确认 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { resourcesApi } from '@/api/request'
import type { Page, ResourceCategory, ResourceItem, ResourceWriteRequest } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import ResourceForm from '@/components/ResourceForm.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const toast = useToastStore()

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  GITHUB: 'GitHub',
  EXAM: '考试题',
  EBOOK: '电子书',
  DOCUMENT: '电子文档',
  OTHER: '其他',
}

const data = ref<Page<ResourceItem> | null>(null)
const loading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 20

const formOpen = ref(false)
const editing = ref<ResourceItem | null>(null)
const saving = ref(false)
const formError = ref('')
const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await resourcesApi.list({ page: page.value, pageSize })
    if (version !== loadVersion) return
    data.value = result
  } catch (err) {
    if (version !== loadVersion) return
    error.value = describeError(err)
  } finally {
    if (version === loadVersion) loading.value = false
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

function openEdit(item: ResourceItem): void {
  editing.value = item
  formError.value = ''
  formOpen.value = true
}

function closeForm(): void {
  formOpen.value = false
  editing.value = null
  formError.value = ''
}

async function submitForm(payload: ResourceWriteRequest): Promise<void> {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await resourcesApi.update(editing.value.id, payload)
      toast.show('资源已更新')
    } else {
      await resourcesApi.create(payload)
      toast.show('资源已创建')
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
    await resourcesApi.remove(id)
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
      <h2>资源管理</h2>
      <button v-if="!formOpen" class="btn btn-clay" type="button" @click="openCreate">新建资源</button>
    </div>

    <ResourceForm
      v-if="formOpen"
      class="inline-form"
      :initial="editing ? { title: editing.title, description: editing.description ?? '', url: editing.url, category: editing.category, tags: editing.tags } : undefined"
      :busy="saving"
      :error="formError"
      @submit="submitForm"
      @cancel="closeForm"
    />

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="还没有资源" hint="点击右上角「新建资源」收录第一个链接。" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>分类</th>
            <th>链接</th>
            <th>标签</th>
            <th>创建人</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="item.id">
            <td class="title-cell">{{ item.title }}</td>
            <td><span class="badge badge-role">{{ CATEGORY_LABELS[item.category] ?? item.category }}</span></td>
            <td>
              <a class="url-link" :href="item.url" target="_blank" rel="noopener">{{ item.url }}</a>
            </td>
            <td>
              <span v-if="item.tags.length === 0" class="sub">—</span>
              <span v-else class="tag-join">{{ item.tags.join(' / ') }}</span>
            </td>
            <td>{{ item.creatorName }}</td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td>
              <div class="ops">
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
              </div>
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

.title-cell {
  font-weight: var(--fw-medium);
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-link {
  color: var(--clay-dark);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  max-width: 18rem;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}

.url-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tag-join {
  color: var(--ink-muted);
  font-size: var(--fs-small);
}

.sub {
  color: var(--ink-faint);
}

.ops {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
</style>
