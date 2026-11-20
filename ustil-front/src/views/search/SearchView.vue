<script setup lang="ts">
/* 统一搜索：人员 / 文章 / 讨论 / 资料 / 公告 / 作业 分类检索（分类项 chips 带命中数，keyword 走各列表既有契约） */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError } from '@/api/error'
import {
  announcementsApi,
  articlesApi,
  assignmentsApi,
  issuesApi,
  resourcesApi,
  usersApi,
} from '@/api/request'
import type {
  AnnouncementItem,
  ArticleListItem,
  AssignmentItem,
  FollowUserItem,
  IssueListItem,
  Page,
  ResourceCategory,
  ResourceItem,
} from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { contentPathId } from '@/utils/content-path'
import { formatDateTime, roleLabel, timeAgo } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'
import AppAvatar from '@/components/AppAvatar.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import IssueCard from '@/components/IssueCard.vue'
import LoadingState from '@/components/LoadingState.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

type ContentType = 'user' | 'article' | 'issue' | 'resource' | 'announcement' | 'assignment'
type SearchType = 'all' | ContentType

const TABS: { value: SearchType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'user', label: '人员' },
  { value: 'article', label: '文章' },
  { value: 'issue', label: '讨论' },
  { value: 'resource', label: '资料' },
  { value: 'announcement', label: '公告' },
  { value: 'assignment', label: '作业' },
]

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  GITHUB: 'GitHub',
  EXAM: '考试题',
  EBOOK: '电子书',
  DOCUMENT: '电子文档',
  OTHER: '其他',
}

/** 「全部」分类预览条数；分类页分页大小 */
const PREVIEW_SIZE = 5
const PAGE_SIZE = 10

const draft = ref('')
const q = ref('')
const activeType = ref<SearchType>('all')
const page = ref(1)
const loading = ref(false)
const error = ref('')

const userResults = ref<Page<FollowUserItem> | null>(null)
const articleResults = ref<Page<ArticleListItem> | null>(null)
const issueResults = ref<Page<IssueListItem> | null>(null)
const resourceResults = ref<Page<ResourceItem> | null>(null)
const announcementResults = ref<Page<AnnouncementItem> | null>(null)
const assignmentResults = ref<Page<AssignmentItem> | null>(null)

const visibleTabs = computed(() =>
  TABS.filter((tab) => tab.value !== 'assignment' || auth.canViewAssignments),
)

interface GroupView {
  key: ContentType
  label: string
  total: number
}

/** 命中数非 0 的分类（分类页仅当前分类；「全部」跳过零命中分组） */
const groups = computed<GroupView[]>(() => {
  const out: GroupView[] = []
  const single = activeType.value !== 'all'
  const fits = (key: ContentType): boolean => !single || activeType.value === key
  const push = (key: ContentType, label: string, results: Page<unknown> | null): void => {
    if (results && fits(key) && results.total > 0) {
      out.push({ key, label, total: results.total })
    }
  }
  push('user', '人员', userResults.value)
  push('article', '文章', articleResults.value)
  push('issue', '讨论', issueResults.value)
  push('resource', '资料', resourceResults.value)
  push('announcement', '公告', announcementResults.value)
  push('assignment', '作业', assignmentResults.value)
  return out
})

const grandTotal = computed(() => groups.value.reduce((sum, group) => sum + group.total, 0))

const emptyTitle = computed(() => {
  const label = TABS.find((tab) => tab.value === activeType.value)?.label ?? ''
  return activeType.value === 'all'
    ? `没有找到「${q.value}」相关结果`
    : `没有找到与「${q.value}」匹配的${label}`
})

function countOf(type: SearchType): number | null {
  switch (type) {
    case 'user':
      return userResults.value?.total ?? null
    case 'article':
      return articleResults.value?.total ?? null
    case 'issue':
      return issueResults.value?.total ?? null
    case 'resource':
      return resourceResults.value?.total ?? null
    case 'announcement':
      return announcementResults.value?.total ?? null
    case 'assignment':
      return assignmentResults.value?.total ?? null
    default:
      return null
  }
}

function resetResults(): void {
  userResults.value = null
  articleResults.value = null
  issueResults.value = null
  resourceResults.value = null
  announcementResults.value = null
  assignmentResults.value = null
}

let loadSeq = 0

async function load(): Promise<void> {
  const seq = ++loadSeq
  error.value = ''
  if (!q.value) {
    resetResults()
    loading.value = false
    return
  }
  loading.value = true
  try {
    const keyword = q.value
    if (activeType.value === 'all') {
      // 等所有分类完成后统一更新；旧请求和部分失败均不能污染当前结果。
      const [users, articles, issues, resources, announcements, assignments] = await Promise.all([
        usersApi.search({ page: 1, pageSize: PREVIEW_SIZE, keyword }),
        articlesApi.list({ page: 1, pageSize: PREVIEW_SIZE, keyword }),
        issuesApi.list({ page: 1, pageSize: PREVIEW_SIZE, keyword }),
        resourcesApi.list({ page: 1, pageSize: PREVIEW_SIZE, keyword }),
        announcementsApi.list({ page: 1, pageSize: PREVIEW_SIZE, keyword }),
        auth.canViewAssignments
          ? assignmentsApi.list({ page: 1, pageSize: PREVIEW_SIZE, keyword })
          : Promise.resolve(null),
      ])
      if (seq !== loadSeq) return
      userResults.value = users
      articleResults.value = articles
      issueResults.value = issues
      resourceResults.value = resources
      announcementResults.value = announcements
      assignmentResults.value = assignments
    } else {
      const p = page.value
      if (activeType.value === 'user') {
        const result = await usersApi.search({ page: p, pageSize: PAGE_SIZE, keyword })
        if (seq === loadSeq) userResults.value = result
      } else if (activeType.value === 'article') {
        const result = await articlesApi.list({ page: p, pageSize: PAGE_SIZE, keyword })
        if (seq === loadSeq) articleResults.value = result
      } else if (activeType.value === 'issue') {
        const result = await issuesApi.list({ page: p, pageSize: PAGE_SIZE, keyword })
        if (seq === loadSeq) issueResults.value = result
      } else if (activeType.value === 'resource') {
        const result = await resourcesApi.list({ page: p, pageSize: PAGE_SIZE, keyword })
        if (seq === loadSeq) resourceResults.value = result
      } else if (activeType.value === 'announcement') {
        const result = await announcementsApi.list({ page: p, pageSize: PAGE_SIZE, keyword })
        if (seq === loadSeq) announcementResults.value = result
      } else {
        const result = await assignmentsApi.list({ page: p, pageSize: PAGE_SIZE, keyword })
        if (seq === loadSeq) assignmentResults.value = result
      }
    }
  } catch (err) {
    if (seq === loadSeq) error.value = describeError(err)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function normalizeType(raw: unknown): SearchType {
  const value = typeof raw === 'string' ? raw : ''
  const hit = TABS.find((tab) => tab.value === value)
  if (!hit) return 'all'
  // 作业分类仅 MEMBER+（同导航显隐口径，权限仍以后端为准）
  if (hit.value === 'assignment' && !auth.canViewAssignments) return 'all'
  return hit.value
}

function syncFromRoute(): void {
  const nextQ = typeof route.query.q === 'string' ? route.query.q.trim().slice(0, KEYWORD_MAX) : ''
  const nextType = normalizeType(route.query.type)
  if (nextQ !== q.value) {
    resetResults()
    page.value = 1
  }
  if (nextType !== activeType.value) page.value = 1
  q.value = nextQ
  activeType.value = nextType
  draft.value = nextQ
}

function submit(): void {
  const next = draft.value.trim()
  if (!next) return
  if (next === q.value) return
  const query: Record<string, string> = { q: next }
  if (activeType.value !== 'all') query.type = activeType.value
  void router.push({ name: 'search', query })
}

function switchType(type: SearchType): void {
  if (type === activeType.value) return
  const query: Record<string, string> = { type }
  if (q.value) query.q = q.value
  void router.push({ name: 'search', query })
}

function changePage(next: number): void {
  page.value = next
  void load()
}

const pendingFollows = new Set<string>()

/** 人员结果内关注按钮（同个人主页粉丝列表口径） */
async function toggleFollowUser(user: FollowUserItem): Promise<void> {
  if (pendingFollows.has(user.id)) return
  pendingFollows.add(user.id)
  try {
    const result = user.isFollowing
      ? await usersApi.unfollow(user.username)
      : await usersApi.follow(user.username)
    user.isFollowing = result.following
    toast.show(result.following ? '已关注' : '已取消关注')
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    pendingFollows.delete(user.id)
  }
}

watch(() => [route.query.q, route.query.type], () => {
  syncFromRoute()
  void load()
}, { immediate: true })
</script>

<template>
  <!-- 沿用整体界面左右布局：左栏（搜索 + 分类），右栏（结果） -->
  <div class="container">
    <div class="search-layout">
      <aside class="search-side">
        <form class="search-form" role="search" @submit.prevent="submit">
          <input
            v-model="draft"
            type="search"
            :maxlength="KEYWORD_MAX"
            placeholder="搜索人员、文章、讨论、资料、公告、作业…"
            aria-label="搜索关键词"
          >
          <button class="btn btn-clay" type="submit">搜索</button>
        </form>

        <nav class="cat-list" role="tablist" aria-label="搜索分类">
          <button
            v-for="tab in visibleTabs"
            :key="tab.value"
            class="chip cat-item"
            :class="{ active: activeType === tab.value }"
            type="button"
            role="tab"
            :aria-selected="activeType === tab.value"
            @click="switchType(tab.value)"
          >
            <span>{{ tab.label }}</span>
            <span v-if="countOf(tab.value) !== null" class="n">{{ countOf(tab.value) }}</span>
          </button>
        </nav>
      </aside>

      <main>
        <div class="section-head">
          <h2>搜索</h2>
          <span v-if="q && !loading && !error" class="hint">找到 {{ grandTotal }} 条结果</span>
        </div>

        <EmptyState v-if="!q" title="输入关键词搜索人员、文章、讨论、资料、公告与作业。" />
        <LoadingState v-else-if="loading" />
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <button class="btn btn-sm btn-secondary" type="button" @click="load">重试</button>
        </EmptyState>
        <EmptyState v-else-if="grandTotal === 0" :title="emptyTitle" />
        <template v-else>
          <section v-for="group in groups" :key="group.key" class="result-group">
            <h3 v-if="activeType === 'all'" class="result-head">
              {{ group.label }}
              <span class="result-total">共 {{ group.total }} 条</span>
              <button
                class="btn btn-ghost btn-sm result-more"
                type="button"
                @click="switchType(group.key)"
              >
                查看全部 →
              </button>
            </h3>

            <div v-if="group.key === 'user'" class="result-list">
              <div v-for="item in userResults?.items ?? []" :key="item.id" class="user-row">
                <RouterLink class="user-main" :to="{ name: 'user-profile', params: { id: item.username } }">
                  <AppAvatar :nickname="item.nickname" :avatar-url="item.avatarUrl || ''" :user-id="item.id" />
                  <span class="user-names">
                    <strong>{{ item.nickname }}</strong>
                    <small>@{{ item.username }}</small>
                  </span>
                  <span class="role-badge" :data-role="item.role">{{ roleLabel(item.role) }}</span>
                </RouterLink>
                <p v-if="item.bio" class="user-bio">{{ item.bio }}</p>
                <button
                  v-if="!item.isSelf && auth.canFollow"
                  class="btn btn-ghost btn-sm"
                  type="button"
                  @click="toggleFollowUser(item)"
                >
                  {{ item.isFollowing ? '已关注' : '关注' }}
                </button>
              </div>
            </div>

            <div v-else-if="group.key === 'article'" class="result-list">
              <ArticleCard v-for="item in articleResults?.items ?? []" :key="item.id" :article="item" />
            </div>

            <div v-else-if="group.key === 'issue'" class="result-list">
              <IssueCard v-for="item in issueResults?.items ?? []" :key="item.id" :issue="item" />
            </div>

            <div v-else-if="group.key === 'resource'" class="result-list">
              <div v-for="item in resourceResults?.items ?? []" :key="item.id" class="row-item">
                <a class="row-title" :href="item.url" target="_blank" rel="noopener noreferrer">
                  {{ item.title }} ↗
                </a>
                <p v-if="item.description" class="row-desc">{{ item.description }}</p>
                <div class="row-meta">
                  <span class="badge badge-gray">{{ CATEGORY_LABELS[item.category] }}</span>
                  <RouterLink class="row-who" :to="{ name: 'user-profile', params: { id: item.creatorUsername } }">
                    {{ item.creatorName }}
                  </RouterLink>
                  <span>{{ timeAgo(item.createdAt) }}</span>
                </div>
              </div>
            </div>

            <div v-else-if="group.key === 'announcement'" class="result-list">
              <div v-for="item in announcementResults?.items ?? []" :key="item.id" class="row-item">
                <RouterLink class="row-title" :to="{ name: 'announcement-detail', params: { id: contentPathId(item) } }">
                  {{ item.title }}
                </RouterLink>
                <div class="row-meta">
                  <span v-if="item.pinned" class="badge badge-clay">置顶</span>
                  <RouterLink class="row-who" :to="{ name: 'user-profile', params: { id: item.authorUsername } }">
                    {{ item.authorName }}
                  </RouterLink>
                  <span>{{ timeAgo(item.createdAt) }}</span>
                </div>
              </div>
            </div>

            <div v-else class="result-list">
              <div v-for="item in assignmentResults?.items ?? []" :key="item.id" class="row-item">
                <RouterLink class="row-title" :to="{ name: 'assignment-detail', params: { id: contentPathId(item) } }">
                  {{ item.title }}
                </RouterLink>
                <div class="row-meta">
                  <StatusBadge kind="assignment" :value="item.state" />
                  <RouterLink class="row-who" :to="{ name: 'user-profile', params: { id: item.publisher.username } }">
                    {{ item.publisher.nickname }}
                  </RouterLink>
                  <span>截止 {{ formatDateTime(item.deadlineAt) }}</span>
                </div>
              </div>
            </div>

            <BasePagination
              v-if="activeType !== 'all'"
              :page="page"
              :page-size="PAGE_SIZE"
              :total="group.total"
              @change="changePage"
            />
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 沿用整体界面左右布局（对齐个人主页双栏比例）：左栏搜索/分类，右栏结果；窄屏折叠单列 */
.search-layout {
  display: grid;
  grid-template-columns: clamp(15rem, 24%, 19rem) minmax(0, 1fr);
  gap: clamp(1.75rem, 3.5vw, 3rem);
  padding-block: var(--pad-y-page) var(--pad-b-page);
  align-items: start;
}
.search-side {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}
/* 左栏搜索框：输入与按钮纵向排布，适配侧栏宽度 */
.search-form {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.search-form input {
  width: 100%;
  min-width: 0;
  padding: 0.7rem 1.05rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-raised);
  font-size: 16px;
  color: var(--ink);
}
.search-form input:focus {
  outline: none;
  border-color: var(--gray-400);
  box-shadow: 0 0 0 3px var(--ring-focus);
}
.search-form .btn {
  align-self: stretch;
  padding-inline: 1.25rem;
}
/* 分类导航：纵向 chip 列表，命中数靠右 */
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
}
.cat-item .n {
  margin-left: 0.55rem;
}
.result-group {
  margin-bottom: var(--gap-md);
}
.result-head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-family: var(--font-serif);
  font-size: var(--fs-lead);
  font-weight: var(--fw-regular);
  margin-bottom: 0.75rem;
}
.result-total {
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  color: var(--ink-faint);
}
.result-more {
  margin-left: auto;
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.row-item {
  padding: 0.75rem 1rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-16);
}
.row-title {
  display: block;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  text-decoration: none;
  overflow-wrap: anywhere;
}
.row-title:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.row-desc {
  margin-top: 0.25rem;
  font-size: var(--fs-small);
  color: var(--ink-muted);
  overflow-wrap: anywhere;
}
.row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.45rem;
  font-size: var(--fs-small);
  color: var(--ink-faint);
}
.row-who {
  color: var(--ink-muted);
  text-decoration: none;
  overflow-wrap: anywhere;
}
.row-who:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.user-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  padding: 0.65rem 1rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-16);
}
.user-main {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  text-decoration: none;
  color: var(--ink);
}
.user-names {
  min-width: 0;
}
.user-names strong {
  display: block;
  font-size: var(--fs-meta);
  overflow-wrap: anywhere;
}
.user-names small {
  display: block;
  color: var(--ink-faint);
  overflow-wrap: anywhere;
}
.user-bio {
  flex: 1 1 12rem;
  min-width: 0;
  font-size: var(--fs-small);
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 窄屏：双栏折叠单列（与全站 820px 断点一致），搜索/分类在上、结果在下 */
@media (max-width: 820px) {
  .search-layout {
    grid-template-columns: 1fr;
  }
}
/* 窄屏：简介独占一行换行显示，不再挤压昵称 */
@media (max-width: 480px) {
  .user-bio {
    flex: 1 1 100%;
    order: 3;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
}
</style>
