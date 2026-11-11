<script setup lang="ts">
/* 公告详情：MarkdownBody 渲染；作者或 WHEEL/ADMIN 显示编辑/删除（显隐为体验优化，权限以后端为准） */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { announcementsApi } from '@/api/request'
import type { AnnouncementItem } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, timeAgo } from '@/utils/format'
import EmptyState from '@/components/EmptyState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const announcement = ref<AnnouncementItem | null>(null)
const loading = ref(true)
const error = ref('')
const confirmDelete = ref(false)
const deleting = ref(false)

const announcementId = computed(() => String(route.params.id))

/** 入口显隐仅为体验优化，权限以后端为准 */
const canManage = computed(() => {
  if (!announcement.value) return false
  return auth.canAccessAdmin || auth.user?.id === announcement.value.authorId
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    announcement.value = await announcementsApi.get(announcementId.value)
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

async function remove(): Promise<void> {
  if (!announcement.value || deleting.value) return
  deleting.value = true
  try {
    await announcementsApi.remove(announcement.value.id)
    toast.show('已移入回收站')
    await router.push({ name: 'announcements' })
  } catch (err) {
    confirmDelete.value = false
    toast.show(describeError(err))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container">
    <article v-if="announcement" class="thread">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink :to="{ name: 'home' }">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="{ name: 'announcements' }">公告栏</RouterLink>
        <span>/</span>
        <span>正文</span>
      </nav>

      <div class="thread-head">
        <div class="tc-top">
          <span v-if="announcement.pinned" class="tag tag-cat" data-tone="clay">置顶</span>
          <span class="tag tag-cat" data-tone="sky">公告</span>
        </div>
        <h1>{{ announcement.title }}</h1>
        <div class="tc-meta">
          <span class="num">{{ announcement.authorName }}</span>
          <span class="num">{{ timeAgo(announcement.createdAt) }}</span>
          <span class="num">更新于 {{ formatDateTime(announcement.updatedAt) }}</span>
        </div>
      </div>

      <div class="post-block">
        <MarkdownBody class="pb-body" :content="announcement.content" />
        <div v-if="canManage" class="pb-actions">
          <RouterLink
            class="btn btn-secondary"
            :to="{ name: 'announcement-edit', params: { id: announcement.id } }"
          >
            编辑
          </RouterLink>
          <template v-if="confirmDelete">
            <button class="btn btn-danger" type="button" :disabled="deleting" @click="remove">
              {{ deleting ? '删除中…' : '确认删除？' }}
            </button>
            <button class="btn btn-ghost" type="button" :disabled="deleting" @click="confirmDelete = false">
              取消
            </button>
            <span class="rm-hint">删除后可在后台回收站恢复</span>
          </template>
          <button v-else class="btn btn-ghost" type="button" @click="confirmDelete = true">
            删除
          </button>
        </div>
      </div>
    </article>

    <div v-else-if="loading" class="empty" style="margin-top: 3rem">加载中…</div>
    <EmptyState v-else-if="error" title="加载失败" :hint="error">
      <p style="margin-top: 1.15rem">
        <button class="btn btn-secondary" type="button" @click="load">重试</button>
      </p>
    </EmptyState>
    <EmptyState v-else title="公告不存在" hint="它可能已被删除。" />
  </div>
</template>
