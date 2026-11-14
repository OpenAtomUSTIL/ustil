<script setup lang="ts">
import { contentPathId } from '@/utils/content-path'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { assignmentsApi } from '@/api/request'
import type { MySubmissionItem } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'
import { downloadAttachmentFile } from '@/utils/download'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const toast = useToastStore()

const items = ref<MySubmissionItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref('')

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await assignmentsApi.mySubmissions({ page: page.value, pageSize })
    items.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function downloadOf(item: MySubmissionItem): Promise<void> {
  if (!item.attachment) return
  try {
    await downloadAttachmentFile(item.attachment.id, item.attachment.fileName)
  } catch (err) {
    toast.show(describeError(err))
  }
}

onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>我的作业提交</h2>
          <span class="hint">共 {{ total }} 条</span>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <p style="margin-top: 1.15rem">
            <button class="btn btn-secondary" type="button" @click="load">重试</button>
          </p>
        </EmptyState>
        <EmptyState v-else-if="items.length === 0" title="还没有提交过作业" hint="去作业详情页提交，提交记录会出现在这里。">
          <p style="margin-top: 1.15rem">
            <RouterLink class="btn btn-clay" :to="{ name: 'assignments' }">去看作业</RouterLink>
          </p>
        </EmptyState>
        <div v-else class="topic-list">
          <div v-for="item in items" :key="item.id" class="topic-card">
            <h3>
              <RouterLink :to="{ name: 'assignment-detail', params: { id: contentPathId({ id: item.assignmentId, slug: item.assignmentSlug }) } }">
                {{ item.assignmentTitle }}
              </RouterLink>
            </h3>
            <div class="tc-meta">
              <span class="num">截止 {{ formatDateTime(item.deadlineAt) }}</span>
              <span class="num">最近提交 {{ formatDateTime(item.updatedAt) }}</span>
            </div>
            <div class="row-actions">
              <span v-if="item.attachment" class="file-line">
                {{ item.attachment.fileName }}
                <button class="btn btn-ghost btn-sm" type="button" @click="downloadOf(item)">下载</button>
              </span>
              <span v-else class="hint">无附件</span>
              <RouterLink class="btn btn-secondary btn-sm" :to="{ name: 'assignment-detail', params: { id: contentPathId({ id: item.assignmentId, slug: item.assignmentSlug }) } }">
                去提交 / 重新提交
              </RouterLink>
            </div>
          </div>
        </div>

        <BasePagination
          v-if="!loading && !error && total > 0"
          :page="page"
          :page-size="pageSize"
          :total="total"
          @change="changePage"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.row-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.file-line {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: var(--fs-small);
  color: var(--ink-muted);
}
</style>
