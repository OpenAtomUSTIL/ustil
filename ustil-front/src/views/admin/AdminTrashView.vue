<script setup lang="ts">
/* 回收站：GET /admin/trash?type=…；POST /admin/trash/:type/:id/restore 恢复软删除内容 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi } from '@/api/request'
import type { Page, TrashItem, TrashType } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
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

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listTrash({
      page: page.value,
      pageSize,
      type: activeType.value,
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

    <div class="admin-filters" role="tablist" aria-label="回收站类型">
      <button
        v-for="tab in TYPE_TABS"
        :key="tab.value"
        class="chip"
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
    <LoadingState v-else-if="loading" />
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
/* 业务独有：标题/摘要单元格截断（全局 .admin-table td 为 nowrap 不截断） */
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
