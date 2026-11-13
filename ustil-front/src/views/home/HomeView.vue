<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { describeError, isForbidden } from '@/api/error'
import { announcementsApi, articlesApi, assignmentsApi, issuesApi } from '@/api/request'
import type { AnnouncementItem, ArticleListItem, IssueListItem } from '@/api/types'
import ArticleCard from '@/components/ArticleCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import IssueCard from '@/components/IssueCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { timeAgo } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()

const articles = ref<ArticleListItem[]>([])
const issues = ref<IssueListItem[]>([])
const announcements = ref<AnnouncementItem[]>([])
const announcementLoading = ref(true)
const announcementError = ref(false)
const articleTotal = ref(0)
const issueTotal = ref(0)
const assignmentTotal = ref(0)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  // 公告栏独立加载，失败不拖垮整页
  void announcementsApi.list({ page: 1, pageSize: 5 })
    .then((result) => {
      announcements.value = result.items
    })
    .catch(() => {
      announcementError.value = true
    })
    .finally(() => {
      announcementLoading.value = false
    })

  try {
    const [articlePage, issuePage, assignmentPage] = await Promise.all([
      articlesApi.list({ page: 1, pageSize: 5 }),
      issuesApi.list({ page: 1, pageSize: 5 }),
      auth.canViewAssignments
        ? assignmentsApi.list({ page: 1, pageSize: 1 })
        : Promise.resolve(null),
    ])
    articles.value = articlePage.items
    issues.value = issuePage.items
    articleTotal.value = articlePage.total
    issueTotal.value = issuePage.total
    assignmentTotal.value = assignmentPage?.total ?? 0
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="hero">
    <div class="container">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">开放原子 · USTIL 学生开源社区</p>
          <h1>把好奇心，<br>变成<em>能被用到</em>的东西</h1>
          <p class="hero-sub">
            USTIL 开放论坛是校园开源社区的公共讨论区：提问、协作、复盘、招新 —— 用开放的方式，把想法推进到有人在用。
          </p>
          <div class="hero-cta">
            <RouterLink v-if="auth.canCreateIssue" class="btn btn-clay btn-lg" :to="{ name: 'issue-new' }">发起讨论</RouterLink>
            <RouterLink class="btn btn-outline btn-lg" :to="{ name: 'issues' }">浏览全部讨论</RouterLink>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><b>{{ articleTotal }}</b><span>文章</span></div>
            <div class="hero-stat"><b>{{ issueTotal }}</b><span>讨论</span></div>
            <div v-if="auth.canViewAssignments" class="hero-stat"><b>{{ assignmentTotal }}</b><span>作业</span></div>
          </div>
        </div>
        <aside class="hero-panel" aria-label="最新讨论">
          <h2>最新讨论</h2>
          <p>社区里刚刚发生的问题与回答</p>
          <div class="topic-mini">
            <RouterLink v-for="issue in issues.slice(0, 3)" :key="issue.id" :to="{ name: 'issue-detail', params: { id: issue.slug } }">
              <StatusBadge kind="issue" :value="issue.status" />
              <span class="tm-title">{{ issue.title }}</span>
            </RouterLink>
            <p v-if="!loading && issues.length === 0" class="tm-title">暂无讨论</p>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <div class="container">
    <div class="entry-grid">
      <RouterLink class="entry-card" :to="{ name: 'articles' }">
        <h3>文章</h3>
        <p>社区的技术长文、周报与复盘沉淀。</p>
        <span class="go">浏览文章 →</span>
      </RouterLink>
      <RouterLink v-if="auth.canViewAssignments" class="entry-card" :to="{ name: 'assignments' }">
        <h3>作业</h3>
        <p>练习任务与提交通道，按截止时间推进。</p>
        <span class="go">查看作业 →</span>
      </RouterLink>
      <RouterLink class="entry-card" :to="{ name: 'issues' }">
        <h3>讨论</h3>
        <p>提问、答疑与一切开放讨论。</p>
        <span class="go">进入讨论区 →</span>
      </RouterLink>
    </div>

    <section class="announce-block" aria-label="公告栏">
      <div class="feed-head">
        <h2>公告栏</h2>
        <RouterLink :to="{ name: 'announcements' }">更多</RouterLink>
      </div>
      <div v-if="announcementLoading" class="empty">加载中…</div>
      <EmptyState v-else-if="announcementError" title="公告加载失败" hint="稍后刷新重试。" />
      <EmptyState v-else-if="announcements.length === 0" title="暂无公告" hint="有新公告会在这里展示。" />
      <div v-else class="announce-list">
        <RouterLink
          v-for="item in announcements"
          :key="item.id"
          class="announce-row"
          :to="{ name: 'announcement-detail', params: { id: item.slug } }"
        >
          <span v-if="item.pinned" class="tag tag-cat" data-tone="clay">置顶</span>
          <span class="an-title">{{ item.title }}</span>
          <span class="an-meta">{{ item.authorName }} · {{ timeAgo(item.createdAt) }}</span>
        </RouterLink>
      </div>
    </section>

    <div class="feeds">
      <section>
        <div class="feed-head">
          <h2>最新文章</h2>
          <RouterLink :to="{ name: 'articles' }">查看全部</RouterLink>
        </div>
        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error" />
        <EmptyState v-else-if="articles.length === 0" title="还没有文章" hint="等待社区的第一篇长文。" />
        <div v-else class="topic-list">
          <ArticleCard v-for="article in articles" :key="article.id" :article="article" />
        </div>
      </section>

      <section>
        <div class="feed-head">
          <h2>最新讨论</h2>
          <RouterLink :to="{ name: 'issues' }">查看全部</RouterLink>
        </div>
        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error" />
        <EmptyState v-else-if="issues.length === 0" title="还没有讨论" hint="发起第一个问题吧。" />
        <div v-else class="topic-list">
          <IssueCard v-for="issue in issues" :key="issue.id" :issue="issue" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.announce-block {
  padding-top: clamp(1.5rem, 3vw, 2.25rem);
}

.announce-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.announce-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.15rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  transition: border-color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
}

.announce-row:hover {
  border-color: var(--gray-400);
  transform: translateX(3px);
}

.an-title {
  font-size: var(--fs-meta);
  font-weight: var(--fw-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.an-meta {
  margin-left: auto;
  flex: none;
  font-size: var(--fs-small);
  color: var(--ink-faint);
}
</style>
