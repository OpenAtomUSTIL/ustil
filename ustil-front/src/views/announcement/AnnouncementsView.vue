<script setup lang="ts">
/* 公告列表：置顶优先（后端 pinned desc, createdAt desc），keyword 搜索，错误处理同文章列表 */
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { announcementsApi } from '@/api/request'
import type { AnnouncementItem } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { timeAgo } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const items = ref<AnnouncementItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const loading = ref(true)
const error = ref('')

function queryPage(): number {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
}

function queryKeyword(): string {
  return typeof route.query.keyword === 'string' ? route.query.keyword : ''
}

function excerpt(content: string): string {
  const text = content.replace(/[#>*`_\-[\]()!]/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 100 ? `${text.slice(0, 100)}…` : text
}

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await announcementsApi.list({
      page: queryPage(),
      pageSize,
      keyword: queryKeyword() || undefined,
    })
    if (version !== loadVersion) return
    items.value = result.items
    total.value = result.total
    page.value = result.page
    keyword.value = queryKeyword()
  } catch (err) {
    if (version !== loadVersion) return
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    error.value = describeError(err)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function search(): void {
  void router.push({
    name: 'announcements',
    query: { keyword: keyword.value.trim() || undefined, page: 1 },
  })
}

function changePage(next: number): void {
  void router.push({
    name: 'announcements',
    query: { keyword: queryKeyword() || undefined, page: next },
  })
}

watch(() => route.fullPath, load)
onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>公告栏</h2>
          <RouterLink v-if="auth.canAccessAdmin" class="btn btn-clay" :to="{ name: 'announcement-new' }">
            发布公告
          </RouterLink>
          <span v-else class="hint">共 {{ total }} 条</span>
        </div>

        <form class="search-box" role="search" @submit.prevent="search">
          <input v-model="keyword" type="search" :maxlength="KEYWORD_MAX" placeholder="搜索公告标题或内容…" aria-label="搜索公告">
          <button class="btn btn-secondary" type="submit">搜索</button>
        </form>

        <div style="height: 1.5rem" />

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <p style="margin-top: 1.15rem">
            <button class="btn btn-secondary" type="button" @click="load">重试</button>
          </p>
        </EmptyState>
        <EmptyState v-else-if="items.length === 0" title="没有找到公告" hint="换个关键词，或者稍后再来。">
          <p v-if="keyword" style="margin-top: 1.15rem">
            <button class="btn btn-secondary" type="button" @click="keyword = ''; search()">清除筛选</button>
          </p>
        </EmptyState>
        <div v-else class="topic-list">
          <div v-for="item in items" :key="item.id" class="topic-card">
            <div class="tc-top">
              <span v-if="item.pinned" class="tag tag-cat" data-tone="clay">置顶</span>
              <span class="tag tag-cat" data-tone="sky">公告</span>
            </div>
            <h3>
              <RouterLink class="tc-title-link" :to="{ name: 'announcement-detail', params: { id: item.slug } }">
                {{ item.title }}
              </RouterLink>
            </h3>
            <p class="tc-excerpt">{{ excerpt(item.content) }}</p>
            <div class="tc-meta">
              <RouterLink class="who" :to="{ name: 'user-profile', params: { id: item.authorUsername } }">
                {{ item.authorName }}
              </RouterLink>
              <span class="num">{{ timeAgo(item.createdAt) }}</span>
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
