<script setup lang="ts">
import { contentPathId } from '@/utils/content-path'
/* 个人主页：GitHub 式双栏（资料卡 + README/置顶/热力图/内容 Tab） */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import { externalHref, formatDate, roleLabel, timeAgo } from '@/utils/format'
import {
  BIO_MAX,
  COMPANY_MAX,
  INVITE_CODE_MAX,
  LINK_MAX,
  LOCATION_MAX,
  NICKNAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  README_MAX,
  SOCIALS_MAX,
  checkCompany,
  checkEmail,
  checkLink,
  checkLocation,
  checkNickname,
  checkPassword,
  checkPhone,
  checkSocials,
  checkTags,
} from '@/utils/limits'
import { AVATAR_EXTENSIONS } from '@/utils/upload'
import AppAvatar from '@/components/AppAvatar.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import AuthCaptcha from '@/components/AuthCaptcha.vue'
import EmailVerification from '@/components/EmailVerification.vue'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import FileUploader from '@/components/FileUploader.vue'
import IssueCard from '@/components/IssueCard.vue'
import LoadingState from '@/components/LoadingState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import TagInput from '@/components/TagInput.vue'
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
const editCompany = ref('')
const editLocation = ref('')
const editLink = ref('')
/** 社交账户 4 个独立输入框（不足补空串） */
const editSocials = ref<string[]>(['', '', '', ''])
/** 擅长标签（本人自配置，≤10 个） */
const editSkillTags = ref<string[]>([])
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
const passwordEmailCode = ref('')
const sendingPwEmailCode = ref(false)
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
const pwCaptchaId = ref('')
const pwCaptchaCode = ref('')
const pwCaptchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const idCaptchaId = ref('')
const idCaptchaCode = ref('')
const idCaptchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const identifierEmailCode = ref('')
const sendingIdEmailCode = ref(false)
const emailNoticeEnabled = ref(false)
const prefsLoading = ref(false)
const prefsSaving = ref(false)
const prefsReady = ref(false)
const prefsError = ref('')
const redeemCaptchaId = ref('')
const redeemCaptchaCode = ref('')
const redeemCaptchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)

const userId = computed(() => String(route.params.id))
/** authorId/creatorId 过滤必须用 UUID（路由参数可能是 username） */
const ownerId = computed(() => profile.value?.id ?? '')
const isSelf = computed(() => profile.value?.isSelf ?? false)
/** 社交账户展示行：空值不显示对应信息行 */
const visibleSocials = computed(() => (profile.value?.socials ?? []).filter((s) => s.trim().length > 0))
/** VISITOR 无提交，统计行不显示提交项 */
const showSubmissionStat = computed(() => profile.value?.role !== 'VISITOR')

const followLoading = ref(false)

async function toggleFollow(): Promise<void> {
  if (!profile.value || followLoading.value) return
  const target = userId.value
  const targetId = profile.value.id
  followLoading.value = true
  try {
    const result = profile.value.isFollowing
      ? await usersApi.unfollow(userId.value)
      : await usersApi.follow(userId.value)
    if (userId.value !== target || profile.value?.id !== targetId) return
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

let profileRequest = 0
let activityRequest = 0
let tabRequest = 0
let pinRequest = 0
onBeforeUnmount(() => {
  profileRequest++; activityRequest++; tabRequest++; pinRequest++
})
const tabError = ref('')

async function load(): Promise<void> {
  const request = ++profileRequest
  const target = userId.value
  const current = () => request === profileRequest && target === userId.value

  activityRequest++; tabRequest++; pinRequest++
  profile.value = null
  activity.value = []
  tabItems.value = []
  tabTotal.value = 0
  loading.value = true
  error.value = ''
  editing.value = false
  showSettings.value = false
  try {
    await auth.ensureReady()
    if (!current()) return
    const result = await usersApi.getProfile(target)
    if (!current()) return
    profile.value = result
    // 旧 id 链接 → 301 到 username 规范地址
    if (profile.value && route.params.id !== profile.value.username) {
      void router.replace({ name: 'user-profile', params: { id: profile.value.username } })
      return
    }
    revealInviteSettings()
    void loadActivity()
    void loadTab()
  } catch (err) {
    if (!current()) return
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
    if (current()) loading.value = false
  }
}

async function loadActivity(): Promise<void> {
  const request = ++activityRequest
  const target = userId.value
  const current = () => request === activityRequest && target === userId.value

  activityLoading.value = true
  try {
    const result = await usersApi.getActivity(userId.value)
    if (!current()) return
    activity.value = result.days
  } catch {
    if (!current()) return
    // 热力图加载失败不拖垮整页
  } finally {
    if (current()) activityLoading.value = false
  }
}

async function loadTab(): Promise<void> {
  const request = ++tabRequest
  const target = userId.value
  const current = () => request === tabRequest && target === userId.value

  if (!ownerId.value) return
  tabError.value = ''
  tabLoading.value = true
  try {
    if (activeTab.value === 'articles') {
      const result = await articlesApi.list({ authorId: ownerId.value, page: tabPage.value, pageSize: tabPageSize })
      if (!current()) return
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'issues') {
      const result = await issuesApi.list({ authorId: ownerId.value, page: tabPage.value, pageSize: tabPageSize })
      if (!current()) return
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'replies') {
      const result = await usersApi.getReplies(userId.value, { page: tabPage.value, pageSize: tabPageSize })
      if (!current()) return
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'followers') {
      const result = await usersApi.getFollowers(userId.value, { page: tabPage.value, pageSize: tabPageSize })
      if (!current()) return
      tabItems.value = result.items
      tabTotal.value = result.total
    } else if (activeTab.value === 'following') {
      const result = await usersApi.getFollowing(userId.value, { page: tabPage.value, pageSize: tabPageSize })
      if (!current()) return
      tabItems.value = result.items
      tabTotal.value = result.total
    } else {
      const result = await resourcesApi.list({ creatorId: ownerId.value, page: tabPage.value, pageSize: tabPageSize })
      if (!current()) return
      tabItems.value = result.items
      tabTotal.value = result.total
    }
  } catch (err) {
    if (!current()) return
    tabError.value = describeError(err)
    tabItems.value = []
    tabTotal.value = 0
  } finally {
    if (current()) tabLoading.value = false
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

const pendingFollows = new Set<string>()

/** 粉丝/关注列表内关注按钮 */
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
  editCompany.value = profile.value?.company ?? ''
  editLocation.value = profile.value?.location ?? ''
  editLink.value = profile.value?.link ?? ''
  const socials = profile.value?.socials ?? []
  editSocials.value = [0, 1, 2, 3].map((i) => socials[i] ?? '')
  editSkillTags.value = [...(profile.value?.skillTags ?? [])]
  editReadme.value = profile.value?.profileReadme ?? ''
  editPinned.value = (profile.value?.pinnedItems ?? []).map((p) => ({ type: p.type, id: p.id, title: p.title }))
  editError.value = ''
  editing.value = true
  showSettings.value = false
  void loadPinOptions()
}

function openSettings(): void {
  // 已展开时保留表单和验证码，避免图片还在但 captchaId 被清空。
  if (showSettings.value) return
  showSettings.value = true
  editing.value = false
  currentPassword.value = ''
  newPassword.value = ''
  newPassword2.value = ''
  passwordError.value = ''
  pwCaptchaId.value = ''
  pwCaptchaCode.value = ''
  passwordEmailCode.value = ''
  identifierType.value = 'email'
  identifierValue.value = ''
  identifierPassword.value = ''
  identifierError.value = ''
  idCaptchaId.value = ''
  idCaptchaCode.value = ''
  identifierEmailCode.value = ''
  inviteCode.value = ''
  redeemError.value = ''
  redeemCaptchaId.value = ''
  redeemCaptchaCode.value = ''
  editUsername.value = profile.value?.username ?? ''
  usernameError.value = ''
  void loadNotificationPrefs()
}

// 从发布权限提示进入时直接展开本人转正表单，并把焦点移到邀请码输入。
function revealInviteSettings(): void {
  if (route.query.settings !== 'invite' || !profile.value?.isSelf || auth.user?.role !== 'VISITOR') return
  openSettings()
  void nextTick(() => document.getElementById('pd-invite')?.focus())
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
  // 字数校验镜像后端契约：company/location ≤100、link/socials 每条 ≤200、socials ≤4
  const profileProblems = [
    checkCompany(editCompany.value),
    checkLocation(editLocation.value),
    checkLink(editLink.value),
    checkSocials(editSocials.value),
    checkTags(editSkillTags.value),
  ]
  const profileProblem = profileProblems.find((p): p is string => p !== null)
  if (profileProblem) {
    editError.value = profileProblem
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
      company: editCompany.value.trim() || null,
      location: editLocation.value.trim() || null,
      link: editLink.value.trim() || null,
      socials: editSocials.value.map((s) => s.trim()).filter((s) => s.length > 0),
      skillTags: editSkillTags.value.map((t) => t.trim()).filter((t) => t.length > 0),
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
  const request = ++pinRequest
  const target = userId.value
  const current = () => request === pinRequest && target === userId.value

  pinOptionsLoading.value = true
  pinPickId.value = ''
  try {
    if (pinType.value === 'ARTICLE') {
      const result = await articlesApi.list({ authorId: ownerId.value, page: 1, pageSize: 50 })
      if (!current()) return
      pinOptions.value = result.items.map((i) => ({ id: i.id, title: i.title }))
    } else if (pinType.value === 'ISSUE') {
      const result = await issuesApi.list({ authorId: ownerId.value, page: 1, pageSize: 50 })
      if (!current()) return
      pinOptions.value = result.items.map((i) => ({ id: i.id, title: i.title }))
    } else {
      const result = await resourcesApi.list({ creatorId: ownerId.value, page: 1, pageSize: 50 })
      if (!current()) return
      pinOptions.value = result.items.map((i) => ({ id: i.id, title: i.title }))
    }
  } catch {
    if (!current()) return
    pinOptions.value = []
  } finally {
    if (current()) pinOptionsLoading.value = false
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
      captchaId: pwCaptchaId.value,
      captchaCode: pwCaptchaCode.value,
      emailCode: passwordEmailCode.value,
    })
    // 改密成功后旧 token 全部失效：清理登录态并回登录页，避免假在线
    toast.show('密码已修改，请重新登录')
    auth.clear()
    await router.push({ name: 'login' })
  } catch (err) {
    passwordError.value = describeError(err)
    // 验证码一次性消费：提交失败后重新拉取
    pwCaptchaCode.value = ''
    void pwCaptchaRef.value?.refresh()
  } finally {
    savingPassword.value = false
  }
}

async function bindIdentifier(): Promise<void> {
  if (savingIdentifier.value || sendingIdEmailCode.value) return
  identifierError.value = ''
  const valueProblem = identifierType.value === 'email'
    ? checkEmail(identifierValue.value)
    : checkPhone(identifierValue.value)
  if (valueProblem) {
    identifierError.value = valueProblem
    return
  }
  if (identifierType.value === 'email' && !identifierEmailCode.value.trim()) {
    identifierError.value = '请填写邮箱验证码'
    return
  }
  if (!idCaptchaId.value || !idCaptchaCode.value.trim()) {
    identifierError.value = '请完成确认修改前的安全校验'
    return
  }
  savingIdentifier.value = true
  try {
    const updated = await usersApi.updateIdentifier({
      type: identifierType.value,
      value: identifierValue.value.trim(),
      password: identifierPassword.value,
      captchaId: idCaptchaId.value,
      captchaCode: idCaptchaCode.value,
      // type='phone' 时不要携带 emailCode 字段
      emailCode: identifierType.value === 'email' ? identifierEmailCode.value.trim() : undefined,
    })
    auth.setUser(updated)
    if (profile.value?.isSelf) {
      profile.value.email = updated.email
      profile.value.phone = updated.phone
    }
    identifierValue.value = ''
    identifierPassword.value = ''
    identifierEmailCode.value = ''
    toast.show('绑定成功')
    // 验证码一次性消费：表单仍可继续使用，换一张
    void idCaptchaRef.value?.refresh()
  } catch (err) {
    identifierError.value = describeError(err)
    // 验证码一次性消费：提交失败后重新拉取
    idCaptchaCode.value = ''
    void idCaptchaRef.value?.refresh()
  } finally {
    savingIdentifier.value = false
  }
}

async function loadNotificationPrefs(): Promise<void> {
  prefsLoading.value = true
  prefsReady.value = false
  prefsError.value = ''
  try {
    const prefs = await usersApi.getNotificationPrefs()
    emailNoticeEnabled.value = prefs.emailNoticeEnabled
    prefsReady.value = true
  } catch (err) {
    prefsError.value = describeError(err)
  } finally {
    prefsLoading.value = false
  }
}

async function saveNotificationPrefs(): Promise<void> {
  if (!prefsReady.value || prefsSaving.value) return
  const next = emailNoticeEnabled.value
  prefsSaving.value = true
  prefsError.value = ''
  try {
    const prefs = await usersApi.updateNotificationPrefs({ emailNoticeEnabled: next })
    emailNoticeEnabled.value = prefs.emailNoticeEnabled
    toast.show(prefs.emailNoticeEnabled ? '已开启邮件提醒' : '已关闭邮件提醒')
  } catch (err) {
    // 保存失败：回滚开关并提示
    emailNoticeEnabled.value = !next
    prefsError.value = describeError(err)
  } finally {
    prefsSaving.value = false
  }
}

function onEmailNoticeChange(event: Event): void {
  emailNoticeEnabled.value = (event.target as HTMLInputElement).checked
  void saveNotificationPrefs()
}

async function redeem(): Promise<void> {
  if (savingRedeem.value) return
  redeemError.value = ''
  savingRedeem.value = true
  try {
    const updated = await authApi.redeemInviteCode({
      inviteCode: inviteCode.value.trim(),
      captchaId: redeemCaptchaId.value,
      captchaCode: redeemCaptchaCode.value,
    })
    auth.setUser(updated)
    toast.show('已转正为学习成员')
  } catch (err) {
    redeemError.value = describeError(err)
    // 验证码一次性消费：提交失败后重新拉取
    redeemCaptchaCode.value = ''
    void redeemCaptchaRef.value?.refresh()
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
watch(() => route.query.settings, revealInviteSettings)
watch(identifierType, () => {
  identifierValue.value = ''
  identifierPassword.value = ''
  identifierEmailCode.value = ''
  identifierError.value = ''
  idCaptchaCode.value = ''
  void idCaptchaRef.value?.refresh()
})
watch(pinType, () => {
  if (editing.value) void loadPinOptions()
})
</script>

<template>
  <div class="container">
    <LoadingState v-if="loading" class="profile-loading" />
    <EmptyState v-else-if="error" title="加载失败" :hint="error">
      <p class="empty-action">
        <button class="btn btn-sm btn-secondary" type="button" @click="load">重试</button>
      </p>
    </EmptyState>

    <div v-else-if="profile" class="profile-layout">
      <!-- 左栏 · 资料卡 -->
      <aside class="profile-sidebar">
        <div class="profile-card">
          <!-- 1. 头像 -->
          <div class="profile-avatar">
            <AppAvatar
              :nickname="profile.nickname"
              :avatar-url="profile.avatarUrl || ''"
              :user-id="profile.id"
              size="xl"
            />
          </div>
          <!-- 2. 昵称 -->
          <h1 class="profile-name">{{ profile.nickname }}</h1>
          <!-- 3. @username · 角色徽章 -->
          <div class="profile-handle-row">
            <span class="profile-handle">@{{ profile.username }}</span>
            <span class="handle-dot" aria-hidden="true">·</span>
            <span class="role-badge" :class="`role-${profile.role.toLowerCase()}`">{{ roleLabel(profile.role) }}</span>
          </div>
          <!-- 4. 简介 -->
          <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>

          <!-- 5. 编辑资料（自视图）/ 关注（访客视图） -->
          <button v-if="isSelf" class="btn btn-outline profile-wide-btn" type="button" @click="startEdit">编辑资料</button>
          <button
            v-else-if="auth.isLoggedIn && auth.user?.role !== 'VISITOR'"
            class="btn profile-wide-btn"
            :class="profile.isFollowing ? 'btn-ghost' : 'btn-clay'"
            type="button"
            :disabled="followLoading"
            @click="toggleFollow"
          >
            {{ profile.isFollowing ? '已关注' : '关注' }}
          </button>

          <!-- 6. 内容统计紧凑行 -->
          <div class="profile-stats">
            <button class="stat-item" type="button" @click="switchTab('articles')">文章 <strong>{{ profile.stats.articles }}</strong></button>
            <button class="stat-item" type="button" @click="switchTab('issues')">讨论 <strong>{{ profile.stats.issues }}</strong></button>
            <button class="stat-item" type="button" @click="switchTab('replies')">回复 <strong>{{ profile.stats.replies }}</strong></button>
            <template v-if="showSubmissionStat">
              <RouterLink v-if="isSelf && auth.canViewAssignments" class="stat-item" :to="{ name: 'my-submissions' }">
                提交 <strong>{{ profile.stats.submissions }}</strong>
              </RouterLink>
              <span v-else class="stat-item">提交 <strong>{{ profile.stats.submissions }}</strong></span>
            </template>
          </div>

          <!-- 7. 粉丝 / 关注行 -->
          <div class="follow-stats">
            <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15.5 20.5v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2a3.7 3.7 0 0 0-3.7 3.7v1.8" />
              <circle cx="9" cy="7.5" r="3.7" />
              <path d="M21.5 20.5v-1.8a3.7 3.7 0 0 0-2.8-3.6M15.5 4.1a3.7 3.7 0 0 1 0 7" />
            </svg>
            <button class="follow-stat" type="button" @click="switchTab('followers')"><strong>{{ profile.followerCount }}</strong> 粉丝</button>
            <span class="handle-dot" aria-hidden="true">·</span>
            <button class="follow-stat" type="button" @click="switchTab('following')"><strong>{{ profile.followingCount }}</strong> 关注</button>
          </div>

          <!-- 8-9. 带图标信息行 -->
          <hr class="profile-divider">
          <ul class="meta-list">
            <li v-if="profile.company" class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21" />
                <path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21" />
                <path d="M2.5 21h19" />
                <path d="M7.5 8h3M7.5 12h3M7.5 16h3" />
                <path d="M16.75 14h.01M16.75 17.5h.01" />
              </svg>
              <span>{{ profile.company }}</span>
            </li>
            <li v-if="profile.location" class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 21.5s6.75-5.6 6.75-11a6.75 6.75 0 1 0-13.5 0c0 5.4 6.75 11 6.75 11Z" />
                <circle cx="12" cy="10.5" r="2.6" />
              </svg>
              <span>{{ profile.location }}</span>
            </li>
            <li v-if="profile.link" class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.5 13.5a4.5 4.5 0 0 0 6.4.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" />
                <path d="M13.5 10.5a4.5 4.5 0 0 0-6.4-.4l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
              </svg>
              <a :href="externalHref(profile.link)" target="_blank" rel="noopener noreferrer">{{ profile.link }}</a>
            </li>
            <li v-for="(social, i) in visibleSocials" :key="`social-${i}`" class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.5 13.5a4.5 4.5 0 0 0 6.4.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" />
                <path d="M13.5 10.5a4.5 4.5 0 0 0-6.4-.4l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
              </svg>
              <a :href="externalHref(social)" target="_blank" rel="noopener noreferrer">{{ social }}</a>
            </li>
            <li class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M3.5 9.5h17M8 3v4M16 3v4" />
              </svg>
              <span>加入于 {{ formatDate(profile.createdAt) }}</span>
            </li>
            <li v-if="isSelf && profile.email" class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2.5" y="5" width="19" height="14" rx="2" />
                <path d="m3 6.8 9 6.2 9-6.2" />
              </svg>
              <span>邮箱：{{ profile.email }}</span>
            </li>
            <li v-if="isSelf && profile.phone" class="meta-row">
              <svg class="meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-5.9-5.9 19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.6a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.4a2 2 0 0 1-.5 2.1L8 9.4a15.9 15.9 0 0 0 5.9 5.9l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.4.6a2 2 0 0 1 1.7 2Z" />
              </svg>
              <span>手机：{{ profile.phone }}</span>
            </li>
          </ul>

          <!-- 10. 擅长标签（本人自配置，未配置不展示） -->
          <template v-if="profile.skillTags.length > 0">
            <hr class="profile-divider">
            <h2 class="profile-subheading">擅长标签</h2>
            <TagsChips :tags="profile.skillTags" target="articles" />
          </template>

          <!-- 11. 管理入口（自视图） -->
          <nav v-if="isSelf" class="profile-admin-links">
            <button class="btn btn-ghost btn-sm" type="button" @click="openSettings">设置</button>
            <RouterLink class="btn btn-ghost btn-sm" :to="{ name: 'my-articles' }">我的文章</RouterLink>
            <RouterLink v-if="auth.canViewAssignments" class="btn btn-ghost btn-sm" :to="{ name: 'my-submissions' }">
              我的作业提交
            </RouterLink>
          </nav>
        </div>
      </aside>

      <!-- 右栏 -->
      <main class="profile-main">
        <!-- 编辑态（GitHub 表单式，按「身份 / 链接与社交 / 内容」分组） -->
        <div v-if="editing && isSelf" class="edit-panel">
          <h3>编辑资料</h3>
          <div v-if="editError" class="form-error">{{ editError }}</div>
          <div class="edit-form">
            <section class="edit-group">
              <h4 class="edit-group-title">身份</h4>
              <div class="field">
                <span class="field-legend">头像</span>
                <FileUploader
                  :extensions="AVATAR_EXTENSIONS"
                  :upload="uploadAvatar"
                  button-text="更换头像"
                />
              </div>
              <div class="field">
                <label for="ep-nickname">昵称</label>
                <input id="ep-nickname" v-model="editNickname" type="text" required :maxlength="NICKNAME_MAX">
              </div>
              <div class="field">
                <label for="ep-bio">简介</label>
                <textarea id="ep-bio" v-model="editBio" :maxlength="BIO_MAX" rows="3" />
                <span class="hint">一句话介绍自己 · {{ editBio.length }}/{{ BIO_MAX }}</span>
              </div>
              <div class="field">
                <span class="field-legend">擅长标签</span>
                <TagInput v-model="editSkillTags" />
                <span class="hint">展示在个人主页侧栏，最多 10 个</span>
              </div>
            </section>

            <section class="edit-group">
              <h4 class="edit-group-title">链接与社交</h4>
              <div class="edit-row">
                <div class="field">
                  <label for="ep-company">公司/学校</label>
                  <input id="ep-company" v-model="editCompany" type="text" :maxlength="COMPANY_MAX">
                </div>
                <div class="field">
                  <label for="ep-location">所在地</label>
                  <input id="ep-location" v-model="editLocation" type="text" :maxlength="LOCATION_MAX">
                </div>
              </div>
              <div class="field">
                <label for="ep-link">个人链接</label>
                <input id="ep-link" v-model="editLink" type="text" :maxlength="LINK_MAX" placeholder="geminimortal.cn">
              </div>
              <div class="field">
                <span class="field-legend">社交账户</span>
                <input
                  v-for="(_, i) in editSocials"
                  :key="i"
                  v-model="editSocials[i]"
                  class="social-input"
                  type="text"
                  :maxlength="LINK_MAX"
                  :placeholder="`链接 ${i + 1}`"
                  :aria-label="`社交账户链接 ${i + 1}`"
                >
                <span class="hint">最多 {{ SOCIALS_MAX }} 条，可填裸域名</span>
              </div>
            </section>

            <section class="edit-group">
              <h4 class="edit-group-title">内容</h4>
              <div class="field">
                <span class="field-legend">个人介绍 README（Markdown，{{ editReadme.length }}/{{ README_MAX }}）</span>
                <MarkdownEditor
                  v-model="editReadme"
                  aria-label="个人介绍 README（Markdown）"
                  min-height="18rem"
                  placeholder="用 Markdown 介绍自己，支持 LaTeX 公式"
                />
              </div>
              <div class="field">
                <span class="field-legend">置顶管理（{{ editPinned.length }}/6）</span>
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
                  <EmptyState v-if="editPinned.length === 0" title="还没有置顶内容。" />
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
                  <p class="hint">最多置顶 6 项，仅限本人内容，顺序即展示顺序。</p>
                </div>
              </div>
            </section>
          </div>
          <div class="form-actions">
            <button class="btn btn-clay" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? '保存中…' : '保存' }}
            </button>
            <button class="btn btn-ghost" type="button" :disabled="saving" @click="editing = false">取消</button>
          </div>
        </div>

        <!-- 设置区（原个人中心抽屉功能迁移） -->
        <div v-if="showSettings && isSelf" class="edit-panel">
          <h3>设置</h3>

          <details class="settings-section" open>
            <summary>用户名（主页地址）</summary>
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
          </details>

          <details class="settings-section">
            <summary>修改密码</summary>
            <p class="hint">需当前密码与邮箱验证码；修改成功后所有设备将退出登录。</p>
            <div v-if="passwordError" class="form-error">{{ passwordError }}</div>
            <form class="form-grid" @submit.prevent="changePassword">
              <div class="field">
                <label for="pw-current">当前密码</label>
                <input id="pw-current" v-model="currentPassword" type="password" autocomplete="current-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
              </div>
              <div class="field">
                <label for="pw-new">新密码</label>
                <input id="pw-new" v-model="newPassword" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
                <span class="hint">{{ PASSWORD_MIN }}-{{ PASSWORD_MAX }} 位，需包含大写字母、小写字母、数字、符号中的至少两类</span>
              </div>
              <div class="field">
                <label for="pw-new2">确认新密码</label>
                <input id="pw-new2" v-model="newPassword2" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
              </div>
              <EmailVerification v-model="passwordEmailCode" :email="auth.user?.email ?? ''" purpose="password" input-id="pw-email-code" :disabled="savingPassword || sendingPwEmailCode" @busy="sendingPwEmailCode = $event" />
              <div class="field">
                <span class="field-legend">图形验证码</span>
                <AuthCaptcha ref="pwCaptchaRef" v-model:captcha-id="pwCaptchaId" v-model="pwCaptchaCode" />
              </div>
              <button class="btn btn-primary" type="submit" :disabled="savingPassword">
                {{ savingPassword ? '提交中…' : '修改密码' }}
              </button>
            </form>
          </details>

          <details class="settings-section">
            <summary>绑定邮箱 / 手机号</summary>
            <p class="hint">{{ auth.user?.email ? `当前绑定邮箱：${auth.user.email}` : '当前未绑定邮箱' }}{{ auth.user?.phone ? ` · 手机号：${auth.user.phone}` : '' }}；换绑邮箱需新邮箱验证码，绑定手机号无需。</p>
            <div v-if="identifierError" class="form-error">{{ identifierError }}</div>
            <form class="form-grid" @submit.prevent="bindIdentifier">
              <div class="field">
                <label for="id-type">类型</label>
                <select id="id-type" v-model="identifierType" :disabled="savingIdentifier || sendingIdEmailCode">
                  <option value="email">邮箱</option>
                  <option value="phone">手机号</option>
                </select>
              </div>
              <div class="field">
                <label for="id-value">{{ identifierType === 'email' ? '邮箱地址' : '手机号' }}</label>
                <input id="id-value" v-model="identifierValue" :type="identifierType === 'email' ? 'email' : 'tel'" :inputmode="identifierType === 'email' ? 'email' : 'tel'" :autocomplete="identifierType === 'email' ? 'email' : 'tel'" :disabled="savingIdentifier || sendingIdEmailCode" required>
              </div>
              <EmailVerification v-if="identifierType === 'email'" v-model="identifierEmailCode" :email="identifierValue" purpose="rebind" input-id="id-email-code" :disabled="savingIdentifier || sendingIdEmailCode" @busy="sendingIdEmailCode = $event" />
              <div class="field">
                <label for="id-password">当前密码（验证身份）</label>
                <input id="id-password" v-model="identifierPassword" type="password" autocomplete="current-password" required>
              </div>
              <div class="field">
                <span class="field-legend">图形验证码</span>
                <AuthCaptcha ref="idCaptchaRef" v-model:captcha-id="idCaptchaId" v-model="idCaptchaCode" :disabled="savingIdentifier || sendingIdEmailCode" />
              </div>
              <button class="btn btn-primary" type="submit" :disabled="savingIdentifier || sendingIdEmailCode">
                {{ savingIdentifier ? '提交中…' : '确认绑定' }}
              </button>
            </form>
          </details>

          <details class="settings-section">
            <summary>邮件提醒</summary>
            <div v-if="prefsError" class="form-error">{{ prefsError }}</div>
            <label class="prefs-toggle">
              <input
                type="checkbox"
                :checked="emailNoticeEnabled"
                :disabled="prefsLoading || prefsSaving || !prefsReady"
                @change="onEmailNoticeChange"
              >
              <span class="prefs-toggle-track" aria-hidden="true" />
              <span class="prefs-toggle-text">接收通知邮件</span>
            </label>
            <p class="hint">{{ prefsLoading ? '加载中…' : '关闭后将不再向邮箱发送通知邮件。' }}</p>
          </details>

          <details v-if="auth.user?.role === 'VISITOR'" class="settings-section" :open="route.query.settings === 'invite'">
            <summary>邀请码转正</summary>
            <p class="hint">持邀请码可立即成为学习成员；临时访客账号满 7 天将自动删除。</p>
            <div v-if="redeemError" class="form-error">{{ redeemError }}</div>
            <form class="form-grid" @submit.prevent="redeem">
              <div class="field">
                <label for="pd-invite">邀请码</label>
                <input id="pd-invite" v-model="inviteCode" type="text" :maxlength="INVITE_CODE_MAX" required placeholder="输入邀请码">
              </div>
              <div class="field">
                <span class="field-legend">图形验证码</span>
                <AuthCaptcha ref="redeemCaptchaRef" v-model:captcha-id="redeemCaptchaId" v-model="redeemCaptchaCode" />
              </div>
              <button class="btn btn-clay" type="submit" :disabled="savingRedeem">
                {{ savingRedeem ? '提交中…' : '转正为学习成员' }}
              </button>
            </form>
          </details>

          <div class="edit-actions">
            <button class="btn btn-ghost" type="button" @click="showSettings = false">收起设置</button>
          </div>
        </div>

        <!-- README 个人介绍（GitHub 式：置顶裸渲染，不加节标题） -->
        <section v-if="!editing && (profile.profileReadme || isSelf)" class="profile-section profile-readme">
          <MarkdownBody v-if="profile.profileReadme" :content="profile.profileReadme" />
          <EmptyState v-else-if="isSelf" title="写一段 Markdown 介绍自己吧。" />
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
                :to="{ name: 'article-detail', params: { id: contentPathId(item) } }"
              >
                {{ item.title }}
              </RouterLink>
              <RouterLink
                v-else-if="item.type === 'ISSUE'"
                class="pinned-title"
                :to="{ name: 'issue-detail', params: { id: contentPathId(item) } }"
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
          <LoadingState v-if="activityLoading" />
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

          <LoadingState v-if="tabLoading" />
          <EmptyState v-else-if="tabError" title="加载失败" :hint="tabError">
            <p class="empty-action">
              <button class="btn btn-sm btn-secondary" type="button" @click="loadTab">重试</button>
            </p>
          </EmptyState>
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
              :to="{ name: 'issue-detail', params: { id: contentPathId({ id: toReply(item).issueId, slug: toReply(item).issueSlug }) } }"
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
.profile-loading {
  margin-top: var(--gap-lg);
}
.profile-layout {
  display: grid;
  grid-template-columns: clamp(14rem, 24%, 18.5rem) minmax(0, 1fr);
  gap: var(--gap-sm);
  margin-top: var(--gap-md);
}
@media (max-width: 820px) {
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
  margin: 1.15rem 0 0.15rem;
  font-family: var(--font-sans);
  font-size: var(--fs-h2);
  font-weight: var(--fw-bold);
  line-height: 1.25;
  word-break: break-word;
}
.profile-handle-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}
.profile-handle {
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  word-break: break-all;
}
.handle-dot {
  color: var(--ink-faint);
}
.profile-wide-btn {
  width: 100%;
  margin: 0.85rem 0 0.55rem;
}
.follow-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-16);
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
  color: var(--link-hover);
}
.follow-names {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
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
.profile-bio {
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  margin: 0.75rem 0;
}
.profile-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin: 0.85rem 0 0.55rem;
  font-size: var(--fs-small);
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
.follow-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.95rem;
  font-size: var(--fs-meta);
  color: var(--ink-muted);
}
.follow-stats .meta-ic {
  margin-top: 0;
}
.follow-stat {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  color: inherit;
}
.follow-stat:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.follow-stat strong {
  font-weight: var(--fw-semibold);
  color: var(--ink);
}
.profile-divider {
  border: none;
  border-top: var(--bw-sm) solid var(--border);
  margin: 0.95rem 0;
}
.meta-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.meta-row {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
  font-size: var(--fs-meta);
  color: var(--ink-muted);
}
.meta-row > span,
.meta-row > a {
  min-width: 0;
  word-break: break-word;
}
.meta-row a {
  color: var(--clay);
  text-decoration: none;
}
.meta-row a:hover {
  color: var(--link-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.meta-ic {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 0.15rem;
  color: var(--ink-faint);
}
.profile-subheading {
  font-family: var(--font-sans);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  margin: 0 0 0.55rem;
}
.profile-admin-links {
  margin-top: 1.15rem;
  padding-top: 1.05rem;
  border-top: var(--bw-sm) solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.15rem;
}
.profile-admin-links .btn {
  width: 100%;
  justify-content: flex-start;
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
.settings-section { border-top: 1px solid var(--border); padding-block: 1.15rem; }
.settings-section:last-child { padding-bottom: 0; }
.settings-section summary { cursor: pointer; font-weight: var(--fw-semibold); color: var(--ink); line-height: 1.5; overflow-wrap: anywhere; }
.settings-section[open] summary { margin-bottom: 1rem; }
.settings-section .form-grid { gap: 1.1rem; margin-top: 1.15rem; max-width: 38rem; }
.settings-section .form-grid > .btn { justify-self: start; align-self: flex-start; }
.settings-section .field { min-width: 0; }
/* 全局 .hint 只覆盖 .field 内；节头直系提示在此补齐同款样式 */
.settings-section .hint { display: block; overflow-wrap: anywhere; line-height: 1.65; font-size: var(--fs-small); color: var(--ink-faint); }
.settings-section summary::marker { color: var(--ink-muted); }
.edit-panel:has(.settings-section) h3 { color: var(--ink); font-size: 1.35rem; letter-spacing: normal; text-transform: none; margin-bottom: 1.3rem; }
@media (max-width: 480px) { .settings-section .form-grid > .btn { align-self: stretch; } }
/* 邮件提醒开关（原生 checkbox 藏于样式轨道之后，语义仍在 input 上） */
.prefs-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}
.prefs-toggle input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.prefs-toggle-track {
  position: relative;
  flex: none;
  width: 2.75rem;
  height: 1.55rem;
  border-radius: var(--br-12);
  border: var(--bw-sm) solid var(--border-strong);
  background: var(--bg-sunken);
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}
.prefs-toggle-track::after {
  content: '';
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: var(--gray-000);
  transition: transform var(--t-fast) var(--ease);
}
.prefs-toggle input:checked + .prefs-toggle-track {
  background: var(--clay);
  border-color: var(--clay);
}
.prefs-toggle input:checked + .prefs-toggle-track::after {
  transform: translateX(1.2rem);
}
.prefs-toggle input:focus-visible + .prefs-toggle-track {
  box-shadow: 0 0 0 3px var(--ring-focus);
}
.prefs-toggle input:disabled + .prefs-toggle-track {
  opacity: 0.55;
}
.prefs-toggle-text {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-muted);
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.55rem;
}
/* 分组：小节标题 + 组内字段纵向排布（拉平 .edit-form 的 flex 语义） */
.edit-group {
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
}
.edit-group-title {
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
/* 短字段两列（公司/所在地），窄屏自动回单列 */
.edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.05rem;
}
.edit-form .field textarea {
  min-height: 4.25rem;
  resize: vertical;
  line-height: 1.6;
}
.social-input + .social-input {
  margin-top: 0.55rem;
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
  border-radius: var(--br-16);
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
  overflow-wrap: anywhere;
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
.heatmap-cell.level-1 { background: var(--hm-1); }
.heatmap-cell.level-2 { background: var(--hm-2); }
.heatmap-cell.level-3 { background: var(--hm-3); }
.heatmap-cell.level-4 { background: var(--hm-4); }
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
  border-radius: var(--br-16);
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
  overflow-wrap: anywhere;
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

/* 窄屏：触控目标 ≥40px；置顶管理下拉保持 16px 字号防 iOS 聚焦缩放 */
@media (max-width: 820px) {
  .btn-sm {
    min-height: 2.5rem;
  }
  .btn-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
  .tab-btn {
    min-height: 2.5rem;
  }
  .stat-item {
    padding: 0.6rem 0;
  }
  .follow-stat {
    padding: 0.55rem 0;
  }
  .pin-add select {
    font-size: 16px;
  }
}

/* 窄屏：卡片内边距收窄；粉丝卡与置顶管理行改竖排，不再挤压标题 */
@media (max-width: 480px) {
  .profile-card {
    padding: 1.1rem;
  }
  .edit-panel {
    padding: 1.15rem;
  }
  /* 短字段两列折叠为单列 */
  .edit-row {
    grid-template-columns: 1fr;
  }
  .follow-card {
    flex-wrap: wrap;
  }
  .follow-bio {
    flex: 1 1 100%;
    order: 3;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
  .pin-row {
    flex-wrap: wrap;
  }
  .pin-title {
    flex: 1 1 100%;
    order: 3;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
  .pin-actions {
    margin-left: auto;
  }
  .pin-add select {
    flex: 1 1 100%;
    max-width: 100%;
  }
}
</style>
