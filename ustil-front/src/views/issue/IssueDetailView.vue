<script setup lang="ts">
import { contentPathId } from '@/utils/content-path'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { issuesApi } from '@/api/request'
import type { IssueDetail, IssueStatus } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, roleLabel, timeAgo } from '@/utils/format'
import AppAvatar from '@/components/AppAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TagsChips from '@/components/TagsChips.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const issue = ref<IssueDetail | null>(null)
const loading = ref(true)
const error = ref('')

const replyContent = ref('')
const submittingReply = ref(false)

const newStatus = ref<IssueStatus>('OPEN')
const savingStatus = ref(false)

const issueId = computed(() => String(route.params.id))

/** 入口显隐仅为体验优化，权限以后端为准 */
const canChangeStatus = computed(() => auth.canManageContent)

const STATUS_OPTIONS: Array<{ value: IssueStatus; label: string }> = [
  { value: 'OPEN', label: '未解决' },
  { value: 'ANSWERED', label: '已解答' },
  { value: 'ON_HOLD', label: '搁置' },
]

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    issue.value = await issuesApi.get(issueId.value)
    newStatus.value = issue.value.status
    // 旧 id 链接 → 301 到 slug 规范地址
    if (issue.value && route.params.id !== contentPathId(issue.value)) {
      void router.replace({ name: 'issue-detail', params: { id: contentPathId(issue.value) } })
    }
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

async function submitReply(): Promise<void> {
  if (submittingReply.value || !issue.value) return
  const content = replyContent.value.trim()
  if (!content) {
    toast.show('回复内容不能为空')
    return
  }
  submittingReply.value = true
  try {
    await issuesApi.reply(issue.value.id, { content })
    toast.show('回复已发布')
    replyContent.value = ''
    await load()
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    toast.show(describeError(err))
  } finally {
    submittingReply.value = false
  }
}

async function saveStatus(): Promise<void> {
  if (savingStatus.value || !issue.value || newStatus.value === issue.value.status) return
  savingStatus.value = true
  try {
    await issuesApi.updateStatus(issue.value.id, { status: newStatus.value })
    toast.show('状态已更新')
    await load()
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    toast.show(describeError(err))
  } finally {
    savingStatus.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container">
    <article v-if="issue" class="thread">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink :to="{ name: 'home' }">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="{ name: 'issues' }">讨论</RouterLink>
        <span>/</span>
        <span>正文</span>
      </nav>

      <div class="thread-head">
        <div class="tc-top">
          <StatusBadge kind="issue" :value="issue.status" />
          <span v-if="issue.status === 'ANSWERED' && issue.answeredBy" class="tag tag-hash">
            由
            <RouterLink class="inline-user" :to="{ name: 'user-profile', params: { id: issue.answeredBy.username } }">
              {{ issue.answeredBy.nickname }}
            </RouterLink>
            于 {{ formatDateTime(issue.answeredAt ?? issue.updatedAt) }} 解答
          </span>
        </div>
        <h1>{{ issue.title }}</h1>
        <TagsChips v-if="issue.tags.length > 0" class="head-tags" :tags="issue.tags" target="issues" />
        <div class="tc-meta">
          <RouterLink class="who" :to="{ name: 'user-profile', params: { id: issue.author.username } }">
            <AppAvatar
              :nickname="issue.author.nickname"
              :avatar-url="issue.author.avatarUrl"
              :user-id="issue.author.id"
              size="lg"
            />
            {{ issue.author.nickname }} · {{ roleLabel(issue.author.role) }}
          </RouterLink>
          <span class="num">{{ timeAgo(issue.createdAt) }}</span>
          <span class="num">{{ issue.replyCount }} 条回复</span>
        </div>
      </div>

      <!-- 变更状态：ADMIN / ALUMNI（显隐为体验优化，权限以后端为准） -->
      <div v-if="canChangeStatus" class="filter-bar" style="margin-top: 1.25rem">
        <label for="issue-status" style="font-size: var(--fs-meta); color: var(--ink-muted)">讨论状态</label>
        <select id="issue-status" v-model="newStatus" style="width: auto; padding: 0.42rem 0.75rem">
          <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="savingStatus || newStatus === issue.status"
          @click="saveStatus"
        >
          {{ savingStatus ? '保存中…' : '保存状态' }}
        </button>
      </div>

      <div class="post-block">
        <MarkdownBody class="pb-body" :content="issue.content" />
      </div>

      <section class="replies">
        <div class="replies-head">
          <h2>{{ issue.replies.length }} 条回复</h2>
        </div>
        <EmptyState v-if="issue.replies.length === 0" title="还没有回复" hint="成为第一个分享看法的人。" />
        <div v-for="(reply, index) in issue.replies" :key="reply.id" class="reply">
          <div class="r-head">
            <AppAvatar
              :nickname="reply.author.nickname"
              :avatar-url="reply.author.avatarUrl"
              :user-id="reply.author.id"
            />
            <RouterLink class="r-name" :to="{ name: 'user-profile', params: { id: reply.author.username } }">
              {{ reply.author.nickname }}
            </RouterLink>
            <span class="r-time">{{ timeAgo(reply.createdAt) }}</span>
            <span class="r-floor">#{{ index + 1 }}</span>
          </div>
          <MarkdownBody class="r-body" :content="reply.content" />
        </div>
      </section>

      <form v-if="auth.isLoggedIn" class="composer" @submit.prevent="submitReply">
        <label class="sr-only">写下你的回复</label>
        <MarkdownEditor
          v-model="replyContent"
          aria-label="写下你的回复"
          min-height="8rem"
          placeholder="写下你的回复…… 支持 **粗体**、`代码` 与 > 引用"
        />
        <div class="cmp-foot">
          <span class="hint">友善、具体、可复现 —— 社区公约</span>
          <button class="btn btn-primary" type="submit" :disabled="submittingReply">
            {{ submittingReply ? '发布中…' : '发布回复' }}
          </button>
        </div>
      </form>
      <div v-else class="composer">
        <p style="color: var(--ink-muted)">
          <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }" style="color: var(--clay-dark)">
            登录
          </RouterLink>
          后即可参与回复。
        </p>
      </div>
    </article>

    <div v-else-if="loading" class="empty" style="margin-top: 3rem">加载中…</div>
    <EmptyState v-else-if="error" title="加载失败" :hint="error" />
    <EmptyState v-else title="讨论不存在" hint="它可能已被删除。" />
  </div>
</template>

<style scoped>
.head-tags {
  margin-top: 1rem;
}
</style>
