<script setup lang="ts">
/* 个人主页：GitHub 式双栏（资料卡 + README/置顶/热力图/内容 Tab） */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, describeError, isForbidden } from '@/api/error'
import { articlesApi, authApi, issuesApi, resourcesApi, usersApi } from '@/api/request'
import type {
  ActivityDay,
  ArticleListItem,
  FollowUserItem,
  IssueListItem,
  PinnedItem,
  ProfileReplyItem,
  ResourceItem,
  UserProfile,
} from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDate, roleLabel, timeAgo } from '@/utils/format'
import {
  BIO_MAX,
  INVITE_CODE_MAX,
  NICKNAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  README_MAX,
  checkNickname,
  checkPassword,
} from '@/utils/limits'
import { AVATAR_EXTENSIONS } from '@/utils/upload'
import AppAvatar from '@/components/AppAvatar.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import FileUploader from '@/components/FileUploader.vue'
import IssueCard from '@/components/IssueCard.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import TagsChips from '@/components/TagsChips.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const error = ref('')

const activity = ref<ActivityDay[]>([])
const activityLoading = ref(false)

type TabKey = 'articles' | 'issues' | 'replies' | 'resources' | 'followers' | 'following'
type TabItem = ArticleListItem | IssueListItem | ResourceItem | ProfileReplyItem | FollowUserItem
const activeTab = ref<TabKey>('articles')
const tabItems = ref<TabItem[]>([])
const tabTotal = ref(0)
const tabPage = ref(1)
const tabPageSize = 10
const tabLoading = ref(false)

const editing = ref(false)
const saving = ref(false)
const editError = ref('')
const editNickname = ref('')
const editBio = ref('')
const editReadme = ref('')
const editPinned = ref<{ type: PinnedItem['type']; id: string; title: string }[]>([])

const pinType = ref<PinnedItem['type']>('ARTICLE')
const pinPickId = ref('')
const pinOptions = ref<{ id: string; title: string }[]>([])
const pinOptionsLoading = ref(false)

const showSettings = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const newPassword2 = ref('')
const passwordError = ref('')
const savingPassword = ref(false)
const identifierType = ref<'email' | 'phone'>('email')
const identifierValue = ref('')
const identifierPassword = ref('')
const identifierError = ref('')
const savingIdentifier = ref(false)
const inviteCode = ref('')
const redeemError = ref('')
const savingRedeem = ref(false)
const editUsername = ref('')
const usernameError = ref('')
const savingUsername = ref(false)

const userId = computed(() => String(route.params.id))
/** authorId/creatorId 过滤必须用 UUID（路由参数可能是 username） */
const ownerId = computed(() => profile.value?.id ?? '')
const isSelf = computed(() => profile.value?.isSelf ?? false)

const followLoading = ref(false)

async function toggleFollow(): Promise<void> {
  if (!profile.value || followLoading.value) return
  followLoading.value = true
  try {
    const result = profile.value.isFollowing
      ? await usersApi.unfollow(userId.value)
      : await usersApi.follow(userId.value)
    profile.value = {
      ...profile.value,
      isFollowing: result.following,
      followerCount: profile.value.followerCount + (result.following ? 1 : -1),
    }
    toast.show(result.following ? '已关注' : '已取消关注')
    if (activeTab.value === 'followers' || activeTab.value === 'following') {
      void loadTab()
    }
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    followLoading.value = false
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  editing.value = false
  showSettings.value = false
  try {
    await auth.ensureReady()
    profile.value = await usersApi.getProfile(userId.value)
    // 旧 id 链接 → 301 到 username 规范地址
    if (profile.value && route.params.id !== profile.value.username) {
      void router.replace({ name: 'user-profile', params: { id: profile.value.username } })
    }
    void loadActivity()
    void loadTab()
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    if (err instanceof ApiError && err.statusCode === 404) {
      void router.push('/404')
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
      const result = await articlesApi.list({ authorId: ownerId.value, page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'issues') {
      const result = await issuesApi.list({ authorId: ownerId.value, page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'replies') {
      const result = await usersApi.getReplies(userId.value, { page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'followers') {
      const result = await usersApi.getFollowers(userId.value, { page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'following') {
      const result = await usersApi.getFollowing(userId.value, { page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    } else {
      const result = await resourcesApi.list({ creatorId: ownerId.value, page: tabPage.value, pageSize: tabPageSize })
      tabItems.value = result.items
      tabTotal.value = result.total
    }
  } catch {
    tabItems.value = []
    tabTotal.value = 0
  } finally {
    tabLoading.value = false
  }
}

function switchTab(tab: TabKey): void {
  activeTab.value = tab
  tabPage.value = 1
  void loadTab()
}

function changeTabPage(next: number): void {
  tabPage.value = next
  void loadTab()
}

function toArticle(item: TabItem): ArticleListItem {
  return item as ArticleListItem
}
function toIssue(item: TabItem): IssueListItem {
  return item as IssueListItem
}
function toReply(item: TabItem): ProfileReplyItem {
  return item as ProfileReplyItem
}
function toResource(item: TabItem): ResourceItem {
  return item as ResourceItem
}
function toFollowUser(item: TabItem): FollowUserItem {
  return item as FollowUserItem
}

/** 粉丝/关注列表内关注按钮 */
async function toggleFollowUser(user: FollowUserItem): Promise<void> {
  try {
    const result = user.isFollowing
      ? await usersApi.unfollow(user.username)
      : await usersApi.follow(user.username)
    user.isFollowing = result.following
    toast.show(result.following ? '已关注' : '已取消关注')
  } catch (err) {
    toast.show(describeError(err))
  }
}

function pinTypeLabel(type: PinnedItem['type']): string {
  return type === 'ARTICLE' ? '文章' : type === 'ISSUE' ? '讨论' : '资源'
}

const tabEmptyHint = computed(() => {
  const who = isSelf.value ? '你' : 'TA'
  switch (activeTab.value) {
    case 'issues':
      return `${who}还没有发起讨论。`
    case 'replies':
      return `${who}还没有回复过讨论。`
    case 'resources':
      return `${who}还没有创建资源。`
    case 'followers':
      return `${who}还没有粉丝。`
    case 'following':
      return `${who}还没有关注任何人。`
    default:
      return `${who}还没有发布文章。`
  }
})

function startEdit(): void {
  editNickname.value = profile.value?.nickname ?? ''
  editBio.value = profile.value?.bio ?? ''
  editReadme.value = profile.value?.profileReadme ?? ''
  editPinned.value = (profile.value?.pinnedItems ?? []).map((p) => ({ type: p.type, id: p.id, title: p.title }))
  editError.value = ''
  editing.value = true
  showSettings.value = false
  void loadPinOptions()
}

function openSettings(): void {
  showSettings.value = true
  editing.value = false
  currentPassword.value = ''
  newPassword.value = ''
  newPassword2.value = ''
  passwordError.value = ''
  identifierType.value = 'email'
  identifierValue.value = ''
  identifierPassword.value = ''
  identifierError.value = ''
  inviteCode.value = ''
  redeemError.value = ''
  editUsername.value = profile.value?.username ?? ''
  usernameError.value = ''
}

async function saveUsername(): Promise<void> {
  if (savingUsername.value) return
  usernameError.value = ''
  const value = editUsername.value.trim()
  if (!/^[A-Za-z0-9_-]{2,32}$/.test(value)) {
    usernameError.value = '用户名需为 2-32 位字母、数字、- 或 _'
    return
  }
  savingUsername.value = true
  try {
    const updated = await usersApi.updateUsername({ username: value })
    auth.setUser(updated)
    toast.show('用户名已更新')
    await router.replace({ name: 'user-profile', params: { id: updated.username } })
    await load()
  } catch (err) {
    usernameError.value = describeError(err)
  } finally {
    savingUsername.value = false
  }
}

async function saveProfile(): Promise<void> {
  if (saving.value) return
  editError.value = ''
  const nicknameProblem = checkNickname(editNickname.value)
  if (nicknameProblem) {
    editError.value = nicknameProblem
    return
  }
  if (editReadme.value.length > README_MAX) {
    editError.value = `个人介绍不能超过 ${README_MAX} 个字符`
    return
  }
  if (editPinned.value.length > 6) {
    editError.value = '置顶内容不能超过 6 项'
    return
  }
  saving.value = true
  try {
    const updated = await usersApi.updateMe({ nickname: editNickname.value.trim() })
    auth.setUser(updated)
    await usersApi.updateProfilePage({
      bio: editBio.value.trim() || null,
      profileReadme: editReadme.value.trim() || null,
      pinnedItems: editPinned.value.map((p) => ({ type: p.type, id: p.id })),
    })
    toast.show('资料已更新')
    editing.value = false
    await load()
  } catch (err) {
    editError.value = describeError(err)
  } finally {
    saving.value = false
  }
}

async function uploadAvatar(file: File, onProgress: (percent: number) => void): Promise<void> {
  const updated = await usersApi.uploadAvatar(file, onProgress)
  auth.setUser(updated)
  if (profile.value) {
    profile.value = { ...profile.value, avatarUrl: updated.avatarUrl }
  }
  toast.show('头像已更新')
}

async function loadPinOptions(): Promise<void> {
  pinOptionsLoading.value = true
  pinPickId.value = ''
  try {
    if (pinType.value === 'ARTICLE') {
      const result = await articlesApi.list({ authorId: ownerId.value, page: 1, pageSize: 50 })
      pinOptions.value = result.items.map((i) => ({ id: i.id, title: i.title }))
    } else if (pinType.value === 'ISSUE') {
      const result = await issuesApi.list({ authorId: ownerId.value, page: 1, pageSize: 50 })
      pinOptions.value = result.items.map((i) => ({ id: i.id, title: i.title }))
    } else {
      const result = await resourcesApi.list({ creatorId: ownerId.value, page: 1, pageSize: 50 })
      pinOptions.value = result.items.map((i) => ({ id: i.id, title: i.title }))
    }
  } catch {
    pinOptions.value = []
  } finally {
    pinOptionsLoading.value = false
  }
}

const addablePinOptions = computed(() =>
  pinOptions.value.filter((o) => !editPinned.value.some((p) => p.type === pinType.value && p.id === o.id)),
)

function addPin(): void {
  const option = pinOptions.value.find((o) => o.id === pinPickId.value)
  if (!option || editPinned.value.length >= 6) return
  editPinned.value.push({ type: pinType.value, id: option.id, title: option.title })
  pinPickId.value = ''
}

function removePin(index: number): void {
  editPinned.value.splice(index, 1)
}

function movePin(index: number, delta: number): void {
  const target = index + delta
  if (target < 0 || target >= editPinned.value.length) return
  const list = [...editPinned.value]
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
  editPinned.value = list
}

async function changePassword(): Promise<void> {
  if (savingPassword.value) return
  passwordError.value = ''
  const passwordProblem = checkPassword(newPassword.value)
  if (passwordProblem) {
    passwordError.value = passwordProblem
    return
  }
  if (newPassword.value !== newPassword2.value) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  savingPassword.value = true
  try {
    await authApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    // 改密成功后旧 token 全部失效：清理登录态并回登录页，避免假在线
    toast.show('密码已修改，请重新登录')
    auth.clear()
    await router.push({ name: 'login' })
  } catch (err) {
    passwordError.value = describeError(err)
  } finally {
    savingPassword.value = false
  }
}

async function bindIdentifier(): Promise<void> {
  if (savingIdentifier.value) return
  identifierError.value = ''
  savingIdentifier.value = true
  try {
    const updated = await usersApi.updateIdentifier({
      type: identifierType.value,
      value: identifierValue.value.trim(),
      password: identifierPassword.value,
    })
    auth.setUser(updated)
    identifierValue.value = ''
    identifierPassword.value = ''
    toast.show('绑定成功')
  } catch (err) {
    identifierError.value = describeError(err)
  } finally {
    savingIdentifier.value = false
  }
}

async function redeem(): Promise<void> {
  if (savingRedeem.value) return
  redeemError.value = ''
  savingRedeem.value = true
  try {
    const updated = await authApi.redeemInviteCode({ inviteCode: inviteCode.value.trim() })
    auth.setUser(updated)
    toast.show('已转正为学习成员')
  } catch (err) {
    redeemError.value = describeError(err)
  } finally {
    savingRedeem.value = false
  }
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// 热力图：近一年 53 周，格子键与后端 UTC 日对齐
const heatmapWeeks = computed(() => {
  const map = new Map<string, number>()
  for (const d of activity.value) {
    map.set(d.date, d.count)
  }
  const today = new Date()
  const todayKey = utcDayKey(today)
  const current = new Date(today)
  current.setUTCDate(current.getUTCDate() - 371)
  current.setUTCDate(current.getUTCDate() - current.getUTCDay())
  const weeks: { date: string; count: number }[][] = []
  let week: { date: string; count: number }[] = []
  while (utcDayKey(current) <= todayKey) {
    const dateStr = utcDayKey(current)
    week.push({ date: dateStr, count: map.get(dateStr) ?? 0 })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }
  if (week.length > 0) weeks.push(week)
  return weeks
})

const activityTotal = computed(() => activity.value.reduce((sum, d) => sum + d.count, 0))

function heatmapTitle(day: { date: string; count: number }): string {
  const localDate = new Date(`${day.date}T00:00:00Z`).toLocaleDateString()
  return `${localDate}：${day.count} 次`
}

onMounted(load)
watch(() => route.params.id, () => {
  if (route.name === 'user-profile') void load()
})
watch(pinType, () => {
  if (editing.value) void loadPinOptions()
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
          <div class="profile-avatar">
            <AppAvatar
              :nickname="profile.nickname"
              :avatar-url="profile.avatarUrl || ''"
              :user-id="profile.id"
              size="xl"
            />
          </div>
          <h1 class="profile-name">{{ profile.nickname }}</h1>
          <div class="profile-handle">@{{ profile.username }}</div>
          <span class="role-badge" :class="`role-${profile.role.toLowerCase()}`">{{ roleLabel(profile.role) }}</span>
          <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>

          <button
            v-if="!isSelf && auth.isLoggedIn && auth.user?.role !== 'VISITOR'"
            class="btn follow-btn"
            :class="profile.isFollowing ? 'btn-ghost' : 'btn-clay'"
            type="button"
            :disabled="followLoading"
            @click="toggleFollow"
          >
            {{ profile.isFollowing ? '已关注' : '关注' }}
          </button>

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
            <RouterLink
              v-if="isSelf && auth.canViewAssignments"
              class="stat-item"
              :to="{ name: 'my-submissions' }"
            >
              <strong>{{ profile.stats.submissions }}</strong> 提交
            </RouterLink>
            <span v-else class="stat-item">
              <strong>{{ profile.stats.submissions }}</strong> 提交
            </span>
            <button class="stat-item" type="button" @click="switchTab('followers')">
              <strong>{{ profile.followerCount }}</strong> 粉丝
            </button>
            <button class="stat-item" type="button" @click="switchTab('following')">
              <strong>{{ profile.followingCount }}</strong> 关注
            </button>
          </div>

          <div class="profile-meta">
            <span>加入于 {{ formatDate(profile.createdAt) }}</span>
          </div>

          <TagsChips v-if="profile.topTags.length > 0" :tags="profile.topTags.map((t) => t.name)" target="articles" />

          <div v-if="isSelf" class="profile-self-actions">
            <div v-if="profile.email" class="contact-line">邮箱：{{ profile.email }}</div>
            <div v-if="profile.phone" class="contact-line">手机：{{ profile.phone }}</div>
            <button class="btn btn-secondary" type="button" @click="startEdit">编辑资料</button>
            <button class="btn btn-ghost" type="button" @click="openSettings">设置</button>
            <RouterLink class="quick-link" :to="{ name: 'my-articles' }">我的文章</RouterLink>
            <RouterLink v-if="auth.canViewAssignments" class="quick-link" :to="{ name: 'my-submissions' }">
              我的作业提交
            </RouterLink>
          </div>
        </div>
      </aside>

      <!-- 右栏 -->
      <main class="profile-main">
        <!-- 编辑态 -->
        <div v-if="editing && isSelf" class="edit-panel">
          <h3>编辑资料</h3>
          <div v-if="editError" class="form-error">{{ editError }}</div>
          <label class="edit-label">
            昵称
            <input v-model="editNickname" type="text" required :maxlength="NICKNAME_MAX">
          </label>
          <div class="edit-label">
            <span class="edit-label-text">头像</span>
            <FileUploader
              :extensions="AVATAR_EXTENSIONS"
              :upload="uploadAvatar"
              button-text="更换头像"
            />
          </div>
          <label class="edit-label">
            简介（{{ editBio.length }}/{{ BIO_MAX }}）
            <input v-model="editBio" :maxlength="BIO_MAX" placeholder="一句话介绍自己">
          </label>
          <div class="edit-label">
            <span class="edit-label-text">个人介绍 README（Markdown，{{ editReadme.length }}/{{ README_MAX }}）</span>
            <MarkdownEditor
              v-model="editReadme"
              aria-label="个人介绍 README（Markdown）"
              min-height="18rem"
              placeholder="用 Markdown 介绍自己，支持 LaTeX 公式"
            />
          </div>
          <div class="edit-label">
            <span class="edit-label-text">置顶管理（{{ editPinned.length }}/6）</span>
            <div class="pin-manage">
              <div v-for="(p, idx) in editPinned" :key="`${p.type}:${p.id}`" class="pin-row">
                <span class="pinned-type">{{ pinTypeLabel(p.type) }}</span>
                <span class="pin-title">{{ p.title }}</span>
                <span class="pin-actions">
                  <button class="btn-icon" type="button" :disabled="idx === 0" aria-label="上移" @click="movePin(idx, -1)">↑</button>
                  <button class="btn-icon" type="button" :disabled="idx === editPinned.length - 1" aria-label="下移" @click="movePin(idx, 1)">↓</button>
                  <button class="btn-icon btn-icon-danger" type="button" aria-label="取消置顶" @click="removePin(idx)">×</button>
                </span>
              </div>
              <p v-if="editPinned.length === 0" class="empty-hint">还没有置顶内容。</p>
              <div class="pin-add">
                <select v-model="pinType" aria-label="置顶类型">
                  <option value="ARTICLE">文章</option>
                  <option value="ISSUE">讨论</option>
                  <option value="RESOURCE">资源</option>
                </select>
                <select v-model="pinPickId" aria-label="选择要置顶的内容" :disabled="pinOptionsLoading">
                  <option value="" disabled>{{ pinOptionsLoading ? '加载中…' : '选择要置顶的内容' }}</option>
                  <option v-for="o in addablePinOptions" :key="o.id" :value="o.id">{{ o.title }}</option>
                </select>
                <button
                  class="btn btn-secondary"
                  type="button"
                  :disabled="!pinPickId || editPinned.length >= 6"
                  @click="addPin"
                >
                  添加置顶
                </button>
              </div>
              <p class="empty-hint">最多置顶 6 项，仅限本人内容，顺序即展示顺序。</p>
            </div>
          </div>
          <div class="edit-actions">
            <button class="btn btn-clay" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? '保存中…' : '保存' }}
            </button>
            <button class="btn btn-ghost" type="button" :disabled="saving" @click="editing = false">取消</button>
          </div>
        </div>

        <!-- 设置区（原个人中心抽屉功能迁移） -->
        <div v-if="showSettings && isSelf" class="edit-panel">
          <h3>设置</h3>

          <section class="settings-section">
            <h4>用户名（主页地址）</h4>
            <p class="hint">主页地址为 /users/用户名，改动后旧链接将自动跳转新地址。</p>
            <div v-if="usernameError" class="form-error">{{ usernameError }}</div>
            <form class="form-grid" @submit.prevent="saveUsername">
              <div class="field">
                <label for="pd-username">用户名</label>
                <input id="pd-username" v-model="editUsername" type="text" required :minlength="2" :maxlength="32" pattern="[A-Za-z0-9_-]+">
              </div>
              <button class="btn btn-primary" type="submit" :disabled="savingUsername">
                {{ savingUsername ? '保存中…' : '保存用户名' }}
              </button>
            </form>
          </section>

          <section class="settings-section">
            <h4>修改密码</h4>
            <div v-if="passwordError" class="form-error">{{ passwordError }}</div>
            <form class="form-grid" @submit.prevent="changePassword">
              <div class="field">
                <label for="pw-current">当前密码</label>
                <input id="pw-current" v-model="currentPassword" type="password" autocomplete="current-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
              </div>
              <div class="field">
                <label for="pw-new">新密码</label>
                <input id="pw-new" v-model="newPassword" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
              </div>
              <div class="field">
                <label for="pw-new2">确认新密码</label>
                <input id="pw-new2" v-model="newPassword2" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
              </div>
              <button class="btn btn-primary" type="submit" :disabled="savingPassword">
                {{ savingPassword ? '提交中…' : '修改密码' }}
              </button>
            </form>
          </section>

          <section class="settings-section">
            <h4>绑定邮箱 / 手机号</h4>
            <div v-if="identifierError" class="form-error">{{ identifierError }}</div>
            <form class="form-grid" @submit.prevent="bindIdentifier">
              <div class="field">
                <label for="id-type">类型</label>
                <select id="id-type" v-model="identifierType">
                  <option value="email">邮箱</option>
                  <option value="phone">手机号</option>
                </select>
              </div>
              <div class="field">
                <label for="id-value">{{ identifierType === 'email' ? '邮箱地址' : '手机号' }}</label>
                <input id="id-value" v-model="identifierValue" type="text" required>
              </div>
              <div class="field">
                <label for="id-password">当前密码（验证身份）</label>
                <input id="id-password" v-model="identifierPassword" type="password" autocomplete="current-password" required>
              </div>
              <button class="btn btn-primary" type="submit" :disabled="savingIdentifier">
                {{ savingIdentifier ? '提交中…' : '确认绑定' }}
              </button>
            </form>
          </section>

          <section v-if="auth.user?.role === 'VISITOR'" class="settings-section">
            <h4>邀请码转正</h4>
            <p class="hint">持邀请码可立即成为学习成员；临时访客账号满 7 天将自动删除。</p>
            <div v-if="redeemError" class="form-error">{{ redeemError }}</div>
            <form class="form-grid" @submit.prevent="redeem">
              <div class="field">
                <label for="pd-invite">邀请码</label>
                <input id="pd-invite" v-model="inviteCode" type="text" :maxlength="INVITE_CODE_MAX" required placeholder="输入邀请码">
              </div>
              <button class="btn btn-clay" type="submit" :disabled="savingRedeem">
                {{ savingRedeem ? '提交中…' : '转正为学习成员' }}
              </button>
            </form>
          </section>

          <div class="edit-actions">
            <button class="btn btn-ghost" type="button" @click="showSettings = false">收起设置</button>
          </div>
        </div>

        <!-- README 个人介绍（GitHub 式：置顶裸渲染，不加节标题） -->
        <section v-if="!editing && (profile.profileReadme || isSelf)" class="profile-section profile-readme">
          <MarkdownBody v-if="profile.profileReadme" :content="profile.profileReadme" />
          <p v-else-if="isSelf" class="empty-hint">写一段 Markdown 介绍自己吧。</p>
        </section>

        <!-- 置顶内容 -->
        <section v-if="profile.pinnedItems.length > 0 && !editing" class="profile-section">
          <h2>置顶</h2>
          <div class="pinned-grid">
            <div v-for="item in profile.pinnedItems" :key="`${item.type}:${item.id}`" class="pinned-card">
              <span class="pinned-type">{{ pinTypeLabel(item.type) }}</span>
              <a
                v-if="item.type === 'RESOURCE' && item.url"
                class="pinned-title"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ item.title }} ↗
              </a>
              <RouterLink
                v-else-if="item.type === 'ARTICLE'"
                class="pinned-title"
                :to="{ name: 'article-detail', params: { id: item.slug } }"
              >
                {{ item.title }}
              </RouterLink>
              <RouterLink
                v-else-if="item.type === 'ISSUE'"
                class="pinned-title"
                :to="{ name: 'issue-detail', params: { id: item.slug } }"
              >
                {{ item.title }}
              </RouterLink>
              <RouterLink v-else class="pinned-title" :to="{ name: 'resources' }">
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
                :title="heatmapTitle(day)"
              />
            </div>
          </div>
        </section>

        <!-- 内容 Tab -->
        <section v-if="!editing" class="profile-section">
          <div class="tab-bar">
            <button
              v-for="tab in ([['articles', '文章'], ['issues', '讨论'], ['replies', '回复'], ['resources', '资源'], ['followers', `粉丝 ${profile.followerCount}`], ['following', `关注 ${profile.followingCount}`]] as const)"
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
          <EmptyState v-else-if="tabItems.length === 0" title="暂无内容" :hint="tabEmptyHint" />
          <div v-else-if="activeTab === 'articles'" class="tab-list">
            <ArticleCard v-for="item in tabItems" :key="item.id" :article="toArticle(item)" />
          </div>
          <div v-else-if="activeTab === 'issues'" class="tab-list">
            <IssueCard v-for="item in tabItems" :key="item.id" :issue="toIssue(item)" />
          </div>
          <div v-else-if="activeTab === 'replies'" class="tab-list">
            <RouterLink
              v-for="item in tabItems"
              :key="item.id"
              class="tab-item"
              :to="{ name: 'issue-detail', params: { id: toReply(item).issueSlug } }"
            >
              <span class="tab-item-title">{{ toReply(item).issueTitle }}</span>
              <span class="tab-item-sub">{{ toReply(item).content }}</span>
              <span class="tab-item-time">{{ timeAgo(toReply(item).createdAt) }}</span>
            </RouterLink>
          </div>
          <div v-else-if="activeTab === 'followers' || activeTab === 'following'" class="tab-list">
            <div v-for="item in tabItems" :key="item.id" class="follow-card">
              <RouterLink class="follow-user" :to="{ name: 'user-profile', params: { id: toFollowUser(item).username } }">
                <AppAvatar
                  :nickname="toFollowUser(item).nickname"
                  :avatar-url="toFollowUser(item).avatarUrl || ''"
                  :user-id="toFollowUser(item).id"
                />
                <span class="follow-names">
                  <strong>{{ toFollowUser(item).nickname }}</strong>
                  <small>@{{ toFollowUser(item).username }}</small>
                </span>
              </RouterLink>
              <p v-if="toFollowUser(item).bio" class="follow-bio">{{ toFollowUser(item).bio }}</p>
              <button
                v-if="!toFollowUser(item).isSelf && auth.isLoggedIn && auth.user?.role !== 'VISITOR'"
                class="btn btn-ghost btn-sm"
                type="button"
                @click="toggleFollowUser(toFollowUser(item))"
              >
                {{ toFollowUser(item).isFollowing ? '已关注' : '关注' }}
              </button>
            </div>
          </div>
          <div v-else class="tab-list">
            <div v-for="item in tabItems" :key="item.id" class="tab-item">
              <a
                class="tab-item-title"
                :href="toResource(item).url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ toResource(item).title }} ↗
              </a>
              <span class="tab-item-time">{{ timeAgo(toResource(item).createdAt) }}</span>
            </div>
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
  grid-template-columns: clamp(14rem, 24%, 18.5rem) minmax(0, 1fr);
  gap: var(--gap-sm);
  margin-top: var(--gap-md);
}
@media (max-width: 768px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
  .profile-card .profile-avatar :deep(.avatar.xl) {
    max-width: 9.5rem;
  }
}
.profile-card {
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  padding: 1.25rem;
  text-align: left;
}
.profile-card .profile-avatar :deep(.avatar.xl) {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  font-size: 4.25rem;
}
.profile-name {
  margin: 1.15rem 0 0.25rem;
  font-family: var(--font-serif);
  font-size: var(--fs-h3);
  font-weight: var(--fw-regular);
}
.profile-handle {
  color: var(--ink-faint);
  font-size: var(--fs-meta);
  margin-bottom: 0.55rem;
  word-break: break-all;
}
.follow-btn {
  width: 100%;
  margin: 0.85rem 0 0.25rem;
}
.follow-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
}
.follow-card .follow-user {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: inherit;
  min-width: 0;
  flex: 1;
}
.follow-card .follow-user:hover strong {
  color: var(--clay-soft);
}
.follow-names {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.follow-names small {
  color: var(--ink-faint);
}
.follow-bio {
  flex: 2;
  min-width: 0;
  margin: 0;
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-badge {
  display: inline-block;
  padding: 0.15rem 0.65rem;
  border-radius: var(--br-pill);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  background: var(--bg-sunken);
}
.role-admin { background: var(--error); color: #fff; }
.role-wheel { background: var(--clay-dark); color: #fff; }
.role-alumni { background: var(--mineral); color: #fff; }
.role-member { background: var(--sky); color: #fff; }
.role-visitor { background: var(--gray-500); color: #fff; }
.profile-bio {
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  margin: 0.75rem 0;
}
.profile-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin: 0.85rem 0;
}
.stat-item {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--fs-small);
  color: var(--ink-muted);
  padding: 0.2rem 0;
  text-decoration: none;
}
.stat-item + .stat-item::before {
  content: '·';
  margin: 0 0.45rem;
  color: var(--ink-faint);
}
.stat-item:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.stat-item strong {
  font-size: inherit;
  font-weight: var(--fw-semibold);
  color: var(--ink);
}
.profile-meta {
  font-size: var(--fs-small);
  color: var(--ink-faint);
  margin: 0.75rem 0;
}
.profile-self-actions {
  margin-top: 1.15rem;
  padding-top: 1.15rem;
  border-top: var(--bw-sm) solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: stretch;
}
.profile-self-actions .btn {
  width: 100%;
}
.contact-line {
  font-size: var(--fs-small);
  color: var(--ink-muted);
}
.quick-link {
  font-size: var(--fs-small);
  color: var(--clay-dark);
  text-decoration: none;
}
.quick-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.profile-main {
  min-width: 0;
}
.profile-section {
  margin-bottom: var(--gap-md);
}
.profile-section h2 {
  font-family: var(--font-serif);
  font-size: var(--fs-lead);
  font-weight: var(--fw-regular);
  margin-bottom: 0.75rem;
}
.profile-readme :deep(.md-body h1),
.profile-readme :deep(.md-body h2) {
  border-bottom: var(--bw-sm) solid var(--border);
  padding-bottom: 0.35rem;
}
.section-hint {
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: var(--fw-regular);
  color: var(--ink-faint);
}
.empty-hint {
  color: var(--ink-faint);
  font-size: var(--fs-meta);
}
.hint {
  color: var(--ink-faint);
  font-size: var(--fs-small);
}
.edit-panel {
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
  padding: 1.5rem;
  margin-bottom: var(--gap-md);
}
.edit-panel h3 {
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 0.85rem;
}
.settings-section {
  margin-bottom: 1.5rem;
}
.settings-section h4 {
  font-family: var(--font-sans);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-muted);
  margin-bottom: 0.65rem;
}
.settings-section .form-grid {
  gap: 1.05rem;
}
.edit-label {
  display: block;
  margin-bottom: 1rem;
  font-size: var(--fs-meta);
  font-weight: var(--fw-medium);
}
.edit-label-text {
  display: block;
  margin-bottom: 0.35rem;
}
.edit-label input,
.edit-label select {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.5rem 0.75rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  font-size: var(--fs-meta);
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
}
.pin-manage {
  margin-top: 0.35rem;
}
.pin-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  margin-bottom: 0.45rem;
}
.pin-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-meta);
}
.pin-actions {
  display: flex;
  gap: 0.25rem;
}
.btn-icon {
  width: 1.75rem;
  height: 1.75rem;
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-6);
  background: var(--bg-sunken);
  cursor: pointer;
  font-size: var(--fs-small);
  color: var(--ink-muted);
}
.btn-icon:disabled {
  opacity: 0.4;
  cursor: default;
}
.btn-icon-danger:hover {
  color: var(--error);
  border-color: var(--error);
}
.pin-add {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.65rem 0;
}
.pin-add select {
  padding: 0.45rem 0.65rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  font-size: var(--fs-meta);
  background: var(--bg-raised);
  max-width: 14rem;
}
.pinned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14.375rem), 1fr));
  gap: 1rem;
}
.pinned-card {
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  padding: 0.75rem 1rem;
}
.pinned-type {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: var(--br-4);
  font-size: 0.7rem;
  background: var(--bg-sunken);
  color: var(--ink-muted);
  margin-bottom: 0.35rem;
}
.pinned-title {
  display: block;
  font-size: var(--fs-meta);
  color: var(--ink);
  text-decoration: none;
}
.pinned-title:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
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
  border-radius: var(--br-2);
  background: var(--gray-200);
}
.heatmap-cell.level-1 { background: #9be9a8; }
.heatmap-cell.level-2 { background: #40c463; }
.heatmap-cell.level-3 { background: #30a14e; }
.heatmap-cell.level-4 { background: #216e39; }
[data-theme='dark'] .heatmap-cell.level-1 { background: #0e4429; }
[data-theme='dark'] .heatmap-cell.level-2 { background: #006d32; }
[data-theme='dark'] .heatmap-cell.level-3 { background: #26a641; }
[data-theme='dark'] .heatmap-cell.level-4 { background: #39d353; }
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: var(--bw-sm) solid var(--border);
}
.tab-btn {
  flex: 0 0 auto;
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: var(--fs-meta);
  color: var(--ink-muted);
  border-bottom: var(--bw-lg) solid transparent;
}
.tab-btn.active {
  color: var(--ink);
  border-bottom-color: var(--accent);
  font-weight: var(--fw-semibold);
}
.tab-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tab-item {
  display: block;
  padding: 0.65rem 1rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-8);
  text-decoration: none;
  color: var(--ink);
}
.tab-item:hover {
  border-color: var(--accent);
}
.tab-item-title {
  display: block;
  font-size: var(--fs-meta);
  color: var(--ink);
  text-decoration: none;
}
.tab-item-title:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.tab-item-sub {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--fs-small);
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-item-time {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--fs-small);
  color: var(--ink-faint);
}
</style>
