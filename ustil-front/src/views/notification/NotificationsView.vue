<script setup lang="ts">
/* 通知中心：列表 + 未读筛选 + 全部已读；点击条目标记已读并跳转 link */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError } from '@/api/error'
import { notificationsApi } from '@/api/request'
import type { NotificationItem, NotificationType, Page } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const notifications = useNotificationsStore()
const toast = useToastStore()

const TYPE_ICONS: Record<NotificationType, string> = {
  ANNOUNCEMENT: '📢',
  ASSIGNMENT: '📝',
  ISSUE_REPLY: '💬',
  ROLE: '🎖',
  SYSTEM: '⚙️',
}

const data = ref<Page<NotificationItem> | null>(null)
const loading = ref(true)
const error = ref('')
const unreadOnly = ref(false)
const page = ref(1)
const pageSize = 20
const busyId = ref('')
const readingAll = ref(false)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await notificationsApi.list({
      page: page.value,
      pageSize,
      unreadOnly: unreadOnly.value || undefined,
    })
    // 打开通知页时刷新未读角标
    void notifications.refresh()
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function toggleUnreadOnly(): void {
  unreadOnly.value = !unreadOnly.value
  page.value = 1
  void load()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

async function open(item: NotificationItem): Promise<void> {
  if (item.readAt === null && busyId.value === '') {
    busyId.value = item.id
    try {
      await notificationsApi.markRead(item.id)
      item.readAt = new Date().toISOString()
      notifications.decrement()
    } catch (err) {
      toast.show(describeError(err))
    } finally {
      busyId.value = ''
    }
  }
  if (!item.link) return
  if (/^https?:\/\//.test(item.link)) {
    window.open(item.link, '_blank', 'noopener')
  } else {
    void router.push(item.link)
  }
}

async function readAll(): Promise<void> {
  if (readingAll.value) return
  readingAll.value = true
  try {
    await notificationsApi.readAll()
    toast.show('已全部标记为已读')
    notifications.reset()
    await load()
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    readingAll.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>通知</h2>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="readingAll || (data?.total ?? 0) === 0"
            @click="readAll"
          >
            {{ readingAll ? '处理中…' : '全部已读' }}
          </button>
        </div>

        <div class="filter-bar" role="tablist" aria-label="已读筛选">
          <button class="chip" :class="{ active: !unreadOnly }" type="button" role="tab" :aria-selected="!unreadOnly" @click="toggleUnreadOnly">
            全部
          </button>
          <button class="chip" :class="{ active: unreadOnly }" type="button" role="tab" :aria-selected="unreadOnly" @click="toggleUnreadOnly">
            仅未读
          </button>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <p style="margin-top: 1.15rem">
            <button class="btn btn-secondary" type="button" @click="load">重试</button>
          </p>
        </EmptyState>
        <EmptyState
          v-else-if="!data || data.items.length === 0"
          :title="unreadOnly ? '没有未读通知' : '暂无通知'"
          hint="有新动态时会在这里提醒你。"
        />
        <div v-else class="topic-list">
          <div
            v-for="item in data.items"
            :key="item.id"
            class="notice-card"
            :class="{ unread: item.readAt === null }"
            role="button"
            tabindex="0"
            @click="open(item)"
            @keydown.enter="open(item)"
          >
            <span class="notice-ic" aria-hidden="true">{{ TYPE_ICONS[item.type] ?? '🔔' }}</span>
            <div class="notice-main">
              <div class="notice-title">
                <span v-if="item.readAt === null" class="unread-dot" aria-label="未读" />
                {{ item.title }}
              </div>
              <p class="notice-body">{{ item.body }}</p>
              <div class="tc-meta">
                <span class="num">{{ formatDateTime(item.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <BasePagination
          v-if="!loading && !error && data && data.total > 0"
          :page="page"
          :page-size="pageSize"
          :total="data.total"
          @change="changePage"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.notice-card {
  display: flex;
  gap: 0.95rem;
  align-items: flex-start;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-16);
  padding: 1.15rem 1.35rem;
  cursor: pointer;
  transition: border-color var(--t-med) var(--ease), box-shadow var(--t-med) var(--ease),
    transform var(--t-med) var(--ease);
}

.notice-card:hover {
  border-color: var(--gray-400);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.notice-card.unread {
  border-color: rgba(217, 119, 87, 0.45);
  background: rgba(217, 119, 87, 0.05);
}

.notice-ic {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: var(--br-12);
  background: var(--gray-150);
  font-size: 1.15rem;
  line-height: 1;
}

.notice-main {
  min-width: 0;
  flex: 1;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: var(--fw-semibold);
  font-size: var(--fs-meta);
}

.unread-dot {
  flex: none;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--clay);
}

.notice-body {
  margin-top: 0.35rem;
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
