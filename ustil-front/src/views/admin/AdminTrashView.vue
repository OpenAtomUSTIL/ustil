<script setup lang="ts">
/* 回收站：GET /admin/trash?type=…；POST /admin/trash/:type/:id/restore 恢复软删除内容 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { Page, TrashItem, TrashType } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const TYPE_TABS: { value: TrashType; label: string }[] = [
  { value: 'ARTICLE', label: '文章' },
  { value: 'ANNOUNCEMENT', label: '公告' },
  { value: 'RESOURCE', label: '资源' },
  { value: 'COMMENT', label: '评论' },
]

const activeType = ref<TrashType>('ARTICLE')
const page = ref(1)
const pageSize = 20

const data = ref<Page<TrashItem> | null>(null)
const loading = ref(true)
const error = ref('')

const restoringId = ref<string | null>(null)

const toast = useToastStore()

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listTrash({
      page: page.value,
      pageSize,
      type: activeType.value,
    })
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function switchType(type: TrashType): void {
  if (activeType.value === type) return
  activeType.value = type
  page.value = 1
  void load()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function restore(item: TrashItem): Promise<void> {
  if (restoringId.value) return
  restoringId.value = item.id
  try {
    await adminApi.restoreTrash(item.type, item.id)
    toast.show('已恢复')
    await load()
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    restoringId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>回收站</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 条</span>
    </div>

    <div class="type-tabs" role="tablist" aria-label="回收站类型">
      <button
        v-for="tab in TYPE_TABS"
        :key="tab.value"
        class="type-tab"
        :class="{ active: activeType === tab.value }"
        type="button"
        role="tab"
        :aria-selected="activeType === tab.value"
        @click="switchType(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="error" class="state-box">
      <p class="form-error">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="empty">加载中…</div>
    <EmptyState v-else-if="!data || data.items.length === 0" title="回收站为空" hint="被删除的内容会先移入这里，可随时恢复" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>摘要</th>
            <th>删除时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="`${item.type}-${item.id}`">
            <td class="title-cell" :title="item.title">{{ item.title || '—' }}</td>
            <td class="summary-cell" :title="item.summary ?? ''">{{ item.summary ?? '—' }}</td>
            <td>{{ formatDateTime(item.deletedAt) }}</td>
            <td>
              <button
                class="btn btn-sm btn-secondary"
                type="button"
                :disabled="restoringId === item.id"
                @click="restore(item)"
              >
                {{ restoringId === item.id ? '恢复中…' : '恢复' }}
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
.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
}

.type-tab {
  padding: 0.42rem 0.95rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-raised);
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease);
}

.type-tab:hover {
  color: var(--ink);
  background: var(--gray-150);
}

.type-tab.active {
  background: var(--ink);
  color: var(--ink-inverse);
  border-color: var(--ink);
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

.title-cell {
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-cell {
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-muted);
}
</style>
