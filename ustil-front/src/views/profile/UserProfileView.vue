<script setup lang="ts">
/* 个人主页：GitHub 式双栏（资料卡 + README/置顶/热力图/内容 Tab） */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { articlesApi, issuesApi, resourcesApi, usersApi } from '@/api/request'
import type { ActivityDay, ArticleListItem, IssueListItem, ResourceItem, UserProfile } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, roleLabel } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import BasePagination from '@/components/BasePagination.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const error = ref('')

const activity = ref<ActivityDay[]>([])
const activityLoading = ref(false)

const activeTab = ref<'articles' | 'issues' | 'replies' | 'resources'>('articles')
const tabItems = ref<(ArticleListItem | IssueListItem | ResourceItem)[]>([])
const tabTotal = ref(0)
const tabPage = ref(1)
const tabPageSize = 10
const tabLoading = ref(false)

const editing = ref(false)
const editBio = ref('')
const editReadme = ref('')
const saving = ref(false)

const userId = computed(() => String(route.params.id))
const isSelf = computed(() => profile.value?.isSelf ?? false)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    profile.value = await usersApi.getProfile(userId.value)
    editBio.value = profile.value.bio ?? ''
    editReadme.value = profile.value.profileReadme ?? ''
    void loadActivity()
    void loadTab()
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    if ((err as { status?: number }).status === 404) {
      void router.push({ name: 'not-found' })
      return
    }
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

async function loadActivity(): Promise<void> {
  activityLoading.value = true
  try {
    const result = await usersApi.getActivity(userId.value)
    activity.value = result.days
  } catch {
    // 热力图加载失败不拖垮整页
  } finally {
    activityLoading.value = false
  }
}

async function loadTab(): Promise<void> {
  tabLoading.value = true
  try {
    if (activeTab.value === 'articles') {
      const result = await articlesApi.list({ authorId: userId.value, page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'issues') {
      const result = await issuesApi.list({ page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'resources') {
      const result = await resourcesApi.list({ page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else {
      tabItems.value = []
      tabTotal.value = 0
    }
  } catch {
    tabItems.value = []
    tabTotal.value = 0
  } finally {
    tabLoading.value = false
  }
}

function switchTab(tab: typeof activeTab.value): void {
  activeTab.value = tab
  tabPage.value = 1
  void loadTab()
}

function changeTabPage(next: number): void {
  tabPage.value = next
  void loadTab()
}

function startEdit(): void {
  editBio.value = profile.value?.bio ?? ''
  editReadme.value = profile.value?.profileReadme ?? ''
  editing.value = true
}

async function saveProfile(): Promise<void> {
  if (saving.value) return
  saving.value = true
  try {
    await usersApi.updateProfilePage({
      bio: editBio.value.trim() || null,
      profileReadme: editReadme.value.trim() || null,
    })
    toast.show('资料已更新')
    editing.value = false
    await load()
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    saving.value = false
  }
}

// 热力图：近一年 53 周
const heatmapWeeks = computed(() => {
  const map = new Map<string, number>()
  for (const d of activity.value) {
    map.set(d.date, d.count)
  }
  const weeks: { date: string; count: number }[][] = []
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 371) // 53 weeks
  start.setDate(start.getDate() - start.getDay()) // align to Sunday
  let current = new Date(start)
  while (current <= now) {
    const week: { date: string; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const dateStr = current.toISOString().slice(0, 10)
      week.push({ date: dateStr, count: map.get(dateStr) ?? 0 })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
})

const activityTotal = computed(() => activity.value.reduce((sum, d) => sum + d.count, 0))

onMounted(load)
watch(() => route.params.id, () => {
  if (route.name === 'user-profile') void load()
})
</script>

<template>
  <div class="container">
    <div v-if="loading" class="empty" style="margin-top: 3rem">加载中…</div>
    <EmptyState v-else-if="error" title="加载失败" :hint="error">
      <p style="margin-top: 1.15rem">
        <button class="btn btn-secondary" type="button" @click="load">重试</button>
      </p>
    </EmptyState>

    <div v-else-if="profile" class="profile-layout">
      <!-- 左栏 · 资料卡 -->
      <aside class="profile-sidebar">
        <div class="profile-card">
          <AppAvatar
            :nickname="profile.nickname"
            :avatar-url="profile.avatarUrl || ''"
            :user-id="profile.id"
            size="xl"
          />
          <h1 class="profile-name">{{ profile.nickname }}</h1>
          <span class="role-badge" :class="`role-${profile.role.toLowerCase()}`">{{ roleLabel(profile.role) }}</span>
          <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>

          <div class="profile-stats">
            <button class="stat-item" type="button" @click="switchTab('articles')">
              <strong>{{ profile.stats.articles }}</strong> 文章
            </button>
            <button class="stat-item" type="button" @click="switchTab('issues')">
              <strong>{{ profile.stats.issues }}</strong> 讨论
            </button>
            <button class="stat-item" type="button" @click="switchTab('replies')">
              <strong>{{ profile.stats.replies }}</strong> 回复
            </button>
            <button class="stat-item" type="button" @click="switchTab('resources')">
              <strong>{{ profile.stats.submissions }}</strong> 提交
            </button>
          </div>

          <div class="profile-meta">
            <span>加入于 {{ formatDateTime(profile.createdAt) }}</span>
          </div>

          <div v-if="profile.topTags.length > 0" class="profile-tags">
            <span v-for="tag in profile.topTags" :key="tag.name" class="tag-chip">
              {{ tag.name }}
            </span>
          </div>

          <div v-if="isSelf" class="profile-self-actions">
            <div v-if="profile.email" class="contact-line">邮箱：{{ profile.email }}</div>
            <div v-if="profile.phone" class="contact-line">手机：{{ profile.phone }}</div>
            <button class="btn btn-secondary" type="button" @click="startEdit">编辑资料</button>
            <RouterLink class="btn btn-ghost" :to="{ name: 'home' }">设置</RouterLink>
          </div>
        </div>
      </aside>

      <!-- 右栏 -->
      <main class="profile-main">
        <!-- 编辑态 -->
        <div v-if="editing && isSelf" class="edit-panel">
          <h3>编辑资料</h3>
          <label class="edit-label">
            简介（{{ editBio.length }}/100）
            <input v-model="editBio" maxlength="100" placeholder="一句话介绍自己">
          </label>
          <label class="edit-label">
            个人介绍 README（Markdown）
            <textarea v-model="editReadme" rows="10" maxlength="10000" placeholder="用 Markdown 介绍自己" />
          </label>
          <div class="edit-actions">
            <button class="btn btn-clay" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? '保存中…' : '保存' }}
            </button>
            <button class="btn btn-ghost" type="button" :disabled="saving" @click="editing = false">取消</button>
          </div>
        </div>

        <!-- README -->
        <section v-if="!editing && (profile.profileReadme || isSelf)" class="profile-section">
          <h2>README</h2>
          <MarkdownBody v-if="profile.profileReadme" :content="profile.profileReadme" />
          <p v-else-if="isSelf" class="empty-hint">写一段 Markdown 介绍自己吧。</p>
        </section>

        <!-- 置顶内容 -->
        <section v-if="profile.pinnedItems.length > 0 && !editing" class="profile-section">
          <h2>置顶</h2>
          <div class="pinned-grid">
            <div v-for="item in profile.pinnedItems" :key="`${item.type}:${item.id}`" class="pinned-card">
              <span class="pinned-type">{{ item.type === 'ARTICLE' ? '文章' : item.type === 'ISSUE' ? '讨论' : '资源' }}</span>
              <RouterLink
                class="pinned-title"
                :to="item.type === 'ARTICLE' ? { name: 'article-detail', params: { id: item.id } } : item.type === 'ISSUE' ? { name: 'issue-detail', params: { id: item.id } } : { name: 'resources' }"
              >
                {{ item.title }}
              </RouterLink>
            </div>
          </div>
        </section>

        <!-- 活跃热力图 -->
        <section v-if="!editing" class="profile-section">
          <h2>活跃度 <span class="section-hint">近一年 {{ activityTotal }} 次贡献</span></h2>
          <div v-if="activityLoading" class="empty-hint">加载中…</div>
          <div v-else class="heatmap">
            <div v-for="(week, wi) in heatmapWeeks" :key="wi" class="heatmap-week">
              <div
                v-for="day in week"
                :key="day.date"
                class="heatmap-cell"
                :class="`level-${Math.min(day.count, 4)}`"
                :title="`${day.date}：${day.count} 次`"
              />
            </div>
          </div>
        </section>

        <!-- 内容 Tab -->
        <section v-if="!editing" class="profile-section">
          <div class="tab-bar">
            <button
              v-for="tab in ([['articles', '文章'], ['issues', '讨论'], ['resources', '资源']] as const)"
              :key="tab[0]"
              class="tab-btn"
              :class="{ active: activeTab === tab[0] }"
              type="button"
              @click="switchTab(tab[0])"
            >
              {{ tab[1] }}
            </button>
          </div>

          <div v-if="tabLoading" class="empty-hint">加载中…</div>
          <EmptyState v-else-if="tabItems.length === 0" title="暂无内容" hint="" />
          <div v-else class="tab-list">
            <RouterLink
              v-for="item in tabItems"
              :key="item.id"
              class="tab-item"
              :to="activeTab === 'articles' ? { name: 'article-detail', params: { id: item.id } } : activeTab === 'issues' ? { name: 'issue-detail', params: { id: item.id } } : { name: 'resources' }"
            >
              <span class="tab-item-title">{{ item.title }}</span>
            </RouterLink>
          </div>

          <BasePagination
            v-if="!tabLoading && tabTotal > 0"
            :page="tabPage"
            :page-size="tabPageSize"
            :total="tabTotal"
            @change="changeTabPage"
          />
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  margin-top: 2rem;
}
@media (max-width: 768px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
.profile-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}
.profile-name {
  margin: 0.75rem 0 0.25rem;
  font-size: 1.35rem;
}
.role-badge {
  display: inline-block;
  padding: 0.15rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-muted, #f0f0f0);
}
.role-admin { background: #dc3545; color: #fff; }
.role-wheel { background: #fd7e14; color: #fff; }
.role-alumni { background: #28a745; color: #fff; }
.role-member { background: #007bff; color: #fff; }
.role-visitor { background: #6c757d; color: #fff; }
.profile-bio {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
  margin: 0.75rem 0;
}
.profile-stats {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}
.stat-item {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
  padding: 0.25rem;
}
.stat-item strong {
  display: block;
  font-size: 1.15rem;
  color: var(--text, #333);
}
.profile-meta {
  font-size: 0.8rem;
  color: var(--text-muted, #999);
  margin: 0.75rem 0;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: center;
  margin: 0.75rem 0;
}
.tag-chip {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: var(--bg-muted, #f0f0f0);
  color: var(--text-secondary, #666);
}
.profile-self-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border, #e0e0e0);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}
.contact-line {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
}
.profile-main {
  min-width: 0;
}
.profile-section {
  margin-bottom: 2rem;
}
.profile-section h2 {
  font-size: 1.15rem;
  margin-bottom: 0.75rem;
}
.section-hint {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--text-muted, #888);
}
.empty-hint {
  color: var(--text-muted, #999);
  font-size: 0.9rem;
}
.edit-panel {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}
.edit-label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
}
.edit-label input,
.edit-label textarea {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 8px;
  font-size: 0.9rem;
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
}
.pinned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}
.pinned-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
.pinned-type {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  background: var(--bg-muted, #f0f0f0);
  margin-bottom: 0.35rem;
}
.pinned-title {
  display: block;
  font-size: 0.9rem;
  color: var(--text, #333);
  text-decoration: none;
}
.pinned-title:hover {
  text-decoration: underline;
}
.heatmap {
  display: flex;
  gap: 3px;
  overflow-x: auto;
}
.heatmap-week {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: var(--bg-muted, #ebedf0);
}
.heatmap-cell.level-1 { background: #9be9a8; }
.heatmap-cell.level-2 { background: #40c463; }
.heatmap-cell.level-3 { background: #30a14e; }
.heatmap-cell.level-4 { background: #216e39; }
.tab-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border, #e0e0e0);
}
.tab-btn {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text-secondary, #666);
  border-bottom: 2px solid transparent;
}
.tab-btn.active {
  color: var(--text, #333);
  border-bottom-color: var(--accent, #333);
  font-weight: 600;
}
.tab-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tab-item {
  padding: 0.65rem 1rem;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text, #333);
}
.tab-item:hover {
  border-color: var(--accent, #333);
}
.tab-item-title {
  font-size: 0.95rem;
}
</style>
