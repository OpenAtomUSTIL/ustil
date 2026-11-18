<script setup lang="ts">
import { contentPathId } from '@/utils/content-path'
/* 资源库：分类 Tab + keyword 搜索 + tag 过滤 + 分页卡片；外链新窗口打开 */
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { resourcesApi } from '@/api/request'
import type { ResourceCategory, ResourceItem } from '@/api/types'
import BasePagination from '@/components/BasePagination.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import TagsChips from '@/components/TagsChips.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/format'
import { KEYWORD_MAX } from '@/utils/limits'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const CATEGORY_TABS: Array<{ value: ResourceCategory | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'EXAM', label: '考试题' },
  { value: 'EBOOK', label: '电子书' },
  { value: 'DOCUMENT', label: '电子文档' },
  { value: 'OTHER', label: '其他' },
]

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  GITHUB: 'GitHub',
  EXAM: '考试题',
  EBOOK: '电子书',
  DOCUMENT: '电子文档',
  OTHER: '其他',
}

const CATEGORY_TONES: Record<ResourceCategory, string> = {
  GITHUB: 'cactus',
  EXAM: 'clay',
  EBOOK: 'plum',
  DOCUMENT: 'sky',
  OTHER: 'peach',
}

const items = ref<ResourceItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const category = ref<ResourceCategory | ''>('')
const tag = ref('')
const loading = ref(true)
const error = ref('')
const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

function queryPage(): number {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
}

function queryKeyword(): string {
  return typeof route.query.keyword === 'string' ? route.query.keyword : ''
}

function queryCategory(): ResourceCategory | '' {
  const raw = route.query.category
  return raw === 'GITHUB' || raw === 'EXAM' || raw === 'EBOOK' || raw === 'DOCUMENT' || raw === 'OTHER'
    ? raw
    : ''
}

function queryTag(): string {
  return typeof route.query.tag === 'string' ? route.query.tag : ''
}

/** 入口显隐仅为体验优化，权限以后端为准 */
function canManage(item: ResourceItem): boolean {
  return auth.isAdmin || (auth.isLoggedIn && auth.user?.id === item.creatorId)
}

// 只展示最近一次筛选的响应，防止慢请求覆盖新结果。
let loadVersion = 0

async function load(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  confirmDeleteId.value = null
  try {
    const result = await resourcesApi.list({
      page: queryPage(),
      pageSize,
      keyword: queryKeyword() || undefined,
      category: queryCategory() || undefined,
      tag: queryTag() || undefined,
    })
    if (version !== loadVersion) return
    items.value = result.items
    total.value = result.total
    page.value = result.page
    keyword.value = queryKeyword()
    category.value = queryCategory()
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

function pushQuery(next: {
  category?: ResourceCategory | ''
  keyword?: string
  tag?: string
  page?: number
}): void {
  void router.push({
    name: 'resources',
    query: {
      category: (next.category ?? category.value) || undefined,
      keyword: (next.keyword ?? queryKeyword()) || undefined,
      tag: (next.tag ?? queryTag()) || undefined,
      page: next.page ?? 1,
    },
  })
}

function search(): void {
  pushQuery({ keyword: keyword.value.trim() })
}

function selectCategory(value: ResourceCategory | ''): void {
  pushQuery({ category: value })
}

function clearTag(): void {
  pushQuery({ tag: '' })
}

function changePage(next: number): void {
  pushQuery({ page: next })
}

async function remove(id: string): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  try {
    await resourcesApi.remove(id)
    toast.show('已移入回收站')
    confirmDeleteId.value = null
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    await load()
  } catch (err) {
    confirmDeleteId.value = null
    toast.show(describeError(err))
  } finally {
    deleting.value = false
  }
}

watch(() => route.fullPath, load)
onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>资源库</h2>
          <RouterLink v-if="auth.canAccessAdmin" class="btn btn-clay" :to="{ name: 'resource-new' }">
            新建资源
          </RouterLink>
          <span v-else class="hint">共 {{ total }} 条</span>
        </div>

        <div class="list-toolbar">
          <form class="search-box" role="search" @submit.prevent="search">
            <input v-model="keyword" type="search" :maxlength="KEYWORD_MAX" placeholder="搜索资源标题或描述…" aria-label="搜索资源">
            <button class="btn btn-secondary" type="submit">搜索</button>
          </form>

          <div class="filter-bar" role="tablist" aria-label="分类筛选">
            <button
              v-for="tab in CATEGORY_TABS"
              :key="tab.value"
              class="chip"
              :class="{ active: category === tab.value }"
              type="button"
              role="tab"
              :aria-selected="category === tab.value"
              @click="selectCategory(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="tag" class="filter-bar">
            <span class="tag-filter">
              标签：# {{ tag }}
              <button type="button" class="tag-clear" aria-label="清除标签筛选" @click="clearTag">×</button>
            </span>
          </div>
        </div>

        <LoadingState v-if="loading" />
        <EmptyState v-else-if="error" title="加载失败" :hint="error">
          <button class="btn btn-sm btn-secondary" type="button" @click="load">重试</button>
        </EmptyState>
        <EmptyState v-else-if="items.length === 0" title="没有找到匹配的资源" hint="换个关键词、分类或标签。">
          <button class="btn btn-secondary" type="button" @click="keyword = ''; pushQuery({ keyword: '', category: '', tag: '' })">
            清除筛选
          </button>
        </EmptyState>
        <div v-else class="topic-list">
          <div v-for="item in items" :key="item.id" class="topic-card">
            <div class="tc-top">
              <span class="tag tag-cat" :data-tone="CATEGORY_TONES[item.category]">
                {{ CATEGORY_LABELS[item.category] ?? item.category }}
              </span>
              <TagsChips :tags="item.tags" target="resources" />
            </div>
            <h3>{{ item.title }}</h3>
            <MarkdownBody v-if="item.description" class="tc-preview tc-excerpt" :content="item.description" />
            <div class="tc-meta">
              <RouterLink class="who" :to="{ name: 'user-profile', params: { id: item.creatorUsername } }">
                {{ item.creatorName }}
              </RouterLink>
              <span class="num">{{ timeAgo(item.createdAt) }}</span>
              <a class="go-link" :href="item.url" target="_blank" rel="noopener">
                打开链接 ↗
              </a>
              <template v-if="canManage(item)">
                <RouterLink class="btn btn-ghost btn-sm" :to="{ name: 'resource-edit', params: { id: contentPathId(item) } }">
                  编辑
                </RouterLink>
                <button class="btn btn-ghost btn-sm" type="button" @click="confirmDeleteId = item.id">
                  删除
                </button>
              </template>
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

        <ConfirmModal
          v-if="confirmDeleteId !== null"
          title="确认删除？"
          message="删除后可在后台回收站恢复"
          confirm-text="删除"
          :busy="deleting"
          @confirm="confirmDeleteId !== null && remove(confirmDeleteId)"
          @cancel="confirmDeleteId = null"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 外链跳转（↗）：与全局 .act（描边 pill 行操作）不同语言，业务独有保留 */
.go-link {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  color: var(--clay-dark);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
}

.go-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* 窄屏触控目标：筛选 chip / 清除标签 × / 小按钮点按高度 ≥40px */
@media (max-width: 820px) {
  .chip,
  .btn-sm {
    min-height: 2.5rem;
  }
  .tag-clear {
    width: 2.5rem;
    height: 2.5rem;
  }
}
</style>
