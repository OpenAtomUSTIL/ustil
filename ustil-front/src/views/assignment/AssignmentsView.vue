<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { assignmentsApi } from '@/api/request'
import type { AssignmentItem } from '@/api/types'
import { formatCountdown, formatDateTime, timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()

const items = ref<AssignmentItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref('')
const now = ref(Date.now())

// 倒计时仅用于展示；能否提交只看接口返回的 canSubmit
let timer: number | undefined

function queryPage(): number {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await assignmentsApi.list({ page: queryPage(), pageSize })
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
  void router.push({ name: 'assignments', query: { page: next } })
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 60_000)
  void load()
})

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})

watch(() => route.fullPath, load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>作业</h2>
          <span class="hint">共 {{ total }} 个</span>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error" />
        <EmptyState v-else-if="items.length === 0" title="暂时没有作业" hint="等待新的练习任务发布。" />

        <div v-else class="topic-list">
          <RouterLink
            v-for="item in items"
            :key="item.id"
            class="topic-card"
            :to="{ name: 'assignment-detail', params: { id: item.id } }"
          >
            <div class="tc-top">
              <StatusBadge kind="assignment" :value="item.state" />
              <span v-if="item.mySubmission" class="tag tag-hash">已提交</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p class="tc-excerpt">{{ item.description }}</p>
            <div class="meta-rows">
              <span>
                <span class="k">发布者</span>
                <span class="v">{{ item.publisher.nickname }}</span>
              </span>
              <span>
                <span class="k">开始</span>
                <span class="v">{{ formatDateTime(item.startAt) }}</span>
              </span>
              <span>
                <span class="k">截止</span>
                <span class="v">{{ formatDateTime(item.deadlineAt) }}</span>
              </span>
              <span class="countdown" :class="{ ended: item.state !== 'OPEN' }">
                {{ item.state === 'NOT_STARTED' ? '尚未开始' : formatCountdown(item.deadlineAt, now) }}
              </span>
            </div>
            <div class="tc-meta">
              <span class="who">
                <AppAvatar
                  :nickname="item.publisher.nickname"
                  :avatar-url="item.publisher.avatarUrl"
                  :user-id="item.publisher.id"
                />
                {{ item.publisher.nickname }}
              </span>
              <span class="num">{{ timeAgo(item.createdAt) }}</span>
              <span v-if="item.canSubmit" class="num" style="color: var(--mineral)">可提交</span>
            </div>
          </RouterLink>
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
