<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { issuesApi } from '@/api/request'
import type { IssueListItem, IssueStatus } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import IssueCard from '@/components/IssueCard.vue'
import { KEYWORD_MAX } from '@/utils/limits'

const route = useRoute()
const router = useRouter()

const items = ref<IssueListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const status = ref<IssueStatus | ''>('')
const tag = ref('')
const loading = ref(true)
const error = ref('')

const STATUS_FILTERS: Array<{ value: IssueStatus | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'OPEN', label: '未解决' },
  { value: 'ANSWERED', label: '已解答' },
  { value: 'ON_HOLD', label: '搁置' },
]

function queryPage(): number {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
}

function queryKeyword(): string {
  return typeof route.query.keyword === 'string' ? route.query.keyword : ''
}

function queryStatus(): IssueStatus | '' {
  const raw = route.query.status
  return raw === 'OPEN' || raw === 'ANSWERED' || raw === 'ON_HOLD' ? raw : ''
}

function queryTag(): string {
  return typeof route.query.tag === 'string' ? route.query.tag : ''
}

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const result = await issuesApi.list({
      page: queryPage(),
      pageSize,
      keyword: queryKeyword() || undefined,
      status: queryStatus() || undefined,
      tag: queryTag() || undefined,
    })
    if (version !== loadVersion) return
    items.value = result.items
    total.value = result.total
    page.value = result.page
    keyword.value = queryKeyword()
    status.value = queryStatus()
    tag.value = queryTag()
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

function applyQuery(nextStatus: IssueStatus | '', nextPage = 1, nextTag = queryTag()): void {
  void router.push({
    name: 'issues',
    query: {
      keyword: keyword.value.trim() || undefined,
      status: nextStatus || undefined,
      tag: nextTag || undefined,
      page: nextPage,
    },
  })
}

function search(): void {
  applyQuery(status.value)
}

function clearTag(): void {
  applyQuery(status.value, 1, '')
}

function changePage(next: number): void {
  applyQuery(status.value, next)
}

watch(() => route.fullPath, load)
onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>讨论</h2>
          <RouterLink class="btn btn-clay" :to="{ name: 'issue-new' }">发起讨论</RouterLink>
        </div>

        <form class="search-box" role="search" @submit.prevent="search">
          <input v-model="keyword" type="search" :maxlength="KEYWORD_MAX" placeholder="搜索讨论标题…" aria-label="搜索讨论">
          <button class="btn btn-secondary" type="submit">搜索</button>
        </form>

        <div class="filter-bar" role="tablist" aria-label="状态筛选" style="margin-top: 1.25rem">
          <button
            v-for="filter in STATUS_FILTERS"
            :key="filter.value"
            class="chip"
            :class="{ active: status === filter.value }"
            type="button"
            role="tab"
            :aria-selected="status === filter.value"
            @click="applyQuery(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>

        <div v-if="tag" class="filter-bar">
          <span class="tag-filter">
            标签：# {{ tag }}
            <button type="button" class="tag-clear" aria-label="清除标签筛选" @click="clearTag">×</button>
          </span>
        </div>

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error" />
        <EmptyState v-else-if="items.length === 0" title="没有找到匹配的讨论" hint="换个关键词或筛选条件。">
          <p style="margin-top: 1.15rem">
            <RouterLink class="btn btn-secondary" :to="{ name: 'issue-new' }">发起一个新讨论</RouterLink>
          </p>
        </EmptyState>
        <div v-else class="topic-list">
          <IssueCard v-for="issue in items" :key="issue.id" :issue="issue" />
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
