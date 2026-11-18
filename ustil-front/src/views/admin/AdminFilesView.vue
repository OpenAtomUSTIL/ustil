<script setup lang="ts">
/* 文件管理：GET /admin/files；kind + keyword 过滤，孤立文件（referenced=false）可删，图片可预览 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi, fileContentUrl } from '@/api/request'
import type { FileItem, FileKind, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import ModalOverlay from '@/components/ModalOverlay.vue'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, formatSize } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

const kindFilter = ref<'' | FileKind>('')
const keywordFilter = ref('')
const page = ref(1)
const pageSize = 20

const data = ref<Page<FileItem> | null>(null)
const loading = ref(true)
const error = ref('')

const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

const previewFile = ref<FileItem | null>(null)
const previewFailed = ref(false)

const toast = useToastStore()

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await adminApi.listFiles({
      page: page.value,
      pageSize,
      kind: kindFilter.value || undefined,
      keyword: keywordFilter.value.trim() || undefined,
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
}

function reset(): void {
  kindFilter.value = ''
  keywordFilter.value = ''
  search()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function remove(file: FileItem): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  try {
    await adminApi.deleteFile(file.id)
    toast.show('文件已删除')
    confirmDeleteId.value = null
    await load()
  } catch (err) {
    // 被引用时后端 409「文件使用中，不可删除」，原文 toast
    toast.show(describeError(err))
    confirmDeleteId.value = null
  } finally {
    deleting.value = false
  }
}

function openPreview(file: FileItem): void {
  previewFile.value = file
  previewFailed.value = false
}

function closePreview(): void {
  previewFile.value = null
}

onMounted(load)
</script>

<template>
  <div>
    <div class="section-head">
      <h2>文件管理</h2>
      <span v-if="data" class="hint">共 {{ data.total }} 个</span>
    </div>

    <form class="admin-filters" role="search" @submit.prevent="search">
      <div class="field">
        <select v-model="kindFilter" aria-label="文件类型">
          <option value="">全部类型</option>
          <option value="ATTACHMENT">附件</option>
          <option value="AVATAR">头像</option>
        </select>
      </div>
      <div class="field">
        <input
          v-model="keywordFilter"
          type="search"
          placeholder="文件名 / 上传人"
          aria-label="关键词"
          :maxlength="KEYWORD_MAX"
        >
      </div>
      <button class="btn btn-secondary" type="submit">搜索</button>
      <button class="btn btn-ghost" type="button" @click="reset">重置</button>
    </form>

    <div v-if="error" class="state-box">
      <p class="form-error">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="load">重试</button>
    </div>
    <LoadingState v-else-if="loading" />
    <EmptyState v-else-if="!data || data.items.length === 0" title="没有匹配的文件" hint="换个筛选条件试试" />

    <div v-else class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>预览</th>
            <th>文件名</th>
            <th>类型</th>
            <th>大小</th>
            <th>上传人</th>
            <th>引用状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in data.items" :key="file.id">
            <td>
              <button
                v-if="file.isImage"
                class="thumb-btn"
                type="button"
                :title="`查看大图：${file.fileName}`"
                @click="openPreview(file)"
              >
                <img
                  class="thumb"
                  :src="fileContentUrl(file.id)"
                  :alt="file.fileName"
                  loading="lazy"
                >
              </button>
              <span v-else class="thumb-none">—</span>
            </td>
            <td class="file-name" :title="file.fileName">{{ file.fileName }}</td>
            <td>
              <span class="badge" :class="file.isImage ? 'badge-plum' : 'badge-gray'">
                {{ file.isImage ? '图片' : '附件' }}
              </span>
            </td>
            <td class="mono">{{ formatSize(file.sizeBytes) }}</td>
            <td class="mono">{{ file.uploaderEmail ?? file.uploaderId }}</td>
            <td>
              <span class="badge" :class="file.referenced ? 'badge-plum' : 'badge-gray'">
                {{ file.referenced ? '使用中' : '孤立' }}
              </span>
            </td>
            <td>{{ formatDateTime(file.createdAt) }}</td>
            <td>
              <template v-if="confirmDeleteId === file.id">
                <button
                  class="btn btn-sm btn-danger"
                  type="button"
                  :disabled="deleting"
                  @click="remove(file)"
                >
                  {{ deleting ? '删除中…' : '确认删除？' }}
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  type="button"
                  :disabled="deleting"
                  @click="confirmDeleteId = null"
                >
                  取消
                </button>
              </template>
              <button
                v-else
                class="btn btn-sm btn-ghost"
                type="button"
                :disabled="file.referenced"
                :title="file.referenced ? '文件使用中，不可删除' : '仅可删除未被引用的孤立文件'"
                @click="confirmDeleteId = file.id"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <BasePagination :page="page" :page-size="pageSize" :total="data.total" @change="changePage" />
    </div>

    <ModalOverlay v-if="previewFile" wide @close="closePreview">
      <div class="preview-head">
        <span class="preview-title">{{ previewFile.fileName }}</span>
        <button class="btn btn-sm btn-ghost" type="button" @click="closePreview">关闭</button>
      </div>
      <p v-if="previewFailed" class="preview-fail">预览加载失败</p>
      <img
        v-else
        class="preview-img"
        :src="fileContentUrl(previewFile.id)"
        :alt="previewFile.fileName"
        @error="previewFailed = true"
      >
    </ModalOverlay>
  </div>
</template>

<style scoped>
/* 业务独有：文件名单元格截断 */
.file-name {
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 业务独有：缩略图按钮与占位 */
.thumb-btn {
  display: inline-flex;
  padding: 0;
  border: none;
  background: none;
  cursor: zoom-in;
  border-radius: var(--br-6);
}

.thumb {
  width: 2.6rem;
  height: 2.6rem;
  object-fit: cover;
  border-radius: var(--br-6);
  border: var(--bw-sm) solid var(--border);
  background: var(--gray-150);
}

.thumb-none {
  color: var(--ink-faint);
}
</style>

<style scoped>
/* 业务独有：预览内容（壳层由 ModalOverlay 提供） */
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.preview-title {
  font-size: var(--fs-meta);
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 与标题行的间距（原 preview-panel 的 flex gap 0.75rem） */
.preview-img {
  margin-top: 0.75rem;
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: var(--br-8);
}

.preview-fail {
  margin: 2rem 0;
  text-align: center;
  color: var(--ink-faint);
}

@media (max-width: 820px) {
  /* 预览弹层经 ModalOverlay 传送到 body，布局层的触控目标规则够不到，此处本地补高 */
  .preview-head .btn-sm {
    padding-block: 0.75rem;
  }
}
</style>
