<script setup lang="ts">
/* 文件管理：GET /admin/files；kind + keyword 过滤，孤立文件（referenced=false）可删，图片可预览 */
import { onMounted, ref } from 'vue'
import { describeError } from '@/api/error'
import { adminApi, fileContentUrl } from '@/api/request'
import type { FileItem, FileKind, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
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

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.listFiles({
      page: page.value,
      pageSize,
      kind: kindFilter.value || undefined,
      keyword: keywordFilter.value.trim() || undefined,
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

    <form class="filter-bar" role="search" @submit.prevent="search">
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
    <div v-else-if="loading" class="empty">加载中…</div>
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
              <span class="type-badge" :class="file.isImage ? 'type-image' : 'type-attachment'">
                {{ file.isImage ? '图片' : '附件' }}
              </span>
            </td>
            <td class="mono">{{ formatSize(file.sizeBytes) }}</td>
            <td class="mono">{{ file.uploaderEmail ?? file.uploaderId }}</td>
            <td>
              <span class="ref-badge" :class="file.referenced ? 'ref-used' : 'ref-orphan'">
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

    <Teleport to="body">
      <div v-if="previewFile" class="preview-overlay" role="dialog" aria-modal="true" @click.self="closePreview">
        <div class="preview-panel">
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
        </div>
      </div>
    </Teleport>
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

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
}

.file-name {
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

.type-badge,
.ref-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: var(--br-6);
  font-size: 0.78rem;
  font-weight: var(--fw-semibold);
  border: var(--bw-sm) solid transparent;
}

.type-image {
  background: rgba(106, 155, 204, 0.13);
  color: var(--sky);
  border-color: rgba(106, 155, 204, 0.3);
}

.type-attachment {
  background: var(--gray-200);
  color: var(--gray-700);
  border-color: var(--border-strong);
}

.ref-used {
  background: rgba(102, 153, 135, 0.16);
  color: var(--mineral);
  border-color: rgba(102, 153, 135, 0.32);
}

.ref-orphan {
  background: rgba(217, 119, 87, 0.12);
  color: var(--clay-dark);
  border-color: rgba(217, 119, 87, 0.3);
}
</style>

<style scoped>
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(32, 30, 28, 0.55);
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: min(56rem, 92vw);
  max-height: 88vh;
  padding: 1rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
}

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

.preview-img {
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
</style>
