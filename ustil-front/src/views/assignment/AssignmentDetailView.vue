<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { assignmentsApi } from '@/api/request'
import type { AssignmentItem, AttachmentView, SubmissionView } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatCountdown, formatDateTime, formatSize, roleLabel, timeAgo } from '@/utils/format'
import { SUBMIT_EXTENSIONS } from '@/utils/upload'
import AppAvatar from '@/components/AppAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import FileUploader from '@/components/FileUploader.vue'
import MarkdownBody from '@/components/MarkdownBody.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import BasePagination from '@/components/BasePagination.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const assignment = ref<AssignmentItem | null>(null)
const loading = ref(true)
const error = ref('')
const note = ref('')

const submissions = ref<SubmissionView[]>([])
const submissionTotal = ref(0)
const submissionPage = ref(1)
const submissionPageSize = 10

const now = ref(Date.now())
let timer: number | undefined

const assignmentId = computed(() => String(route.params.id))

const isPublisher = computed(
  () => auth.user !== null && assignment.value?.publisher.id === auth.user.id,
)
/** 入口显隐仅为体验优化，权限以后端为准 */
const canViewSubmissions = computed(() => auth.isAdmin || (auth.canManageContent && isPublisher.value))

async function download(attachment: AttachmentView): Promise<void> {
  try {
    const blob = await assignmentsApi.downloadAttachment(attachment.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.originalName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch (err) {
    toast.show(describeError(err))
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    assignment.value = await assignmentsApi.get(assignmentId.value)
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

async function loadSubmissions(): Promise<void> {
  if (!canViewSubmissions.value) return
  try {
    const result = await assignmentsApi.submissions(assignmentId.value, {
      page: submissionPage.value,
      pageSize: submissionPageSize,
    })
    submissions.value = result.items
    submissionTotal.value = result.total
    submissionPage.value = result.page
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    toast.show(describeError(err))
  }
}

/** 上传实现：file 必填、note 选填；成功后刷新提交状态 */
async function submitFile(file: File, onProgress: (percent: number) => void): Promise<void> {
  await assignmentsApi.submit(
    assignmentId.value,
    file,
    note.value.trim() || undefined,
    onProgress,
  )
  toast.show('作业已提交')
  note.value = ''
  await load()
  if (canViewSubmissions.value) {
    submissionPage.value = 1
    await loadSubmissions()
  }
}

function changeSubmissionPage(next: number): void {
  submissionPage.value = next
  void loadSubmissions()
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 60_000)
  void load().then(() => loadSubmissions())
})

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})
</script>

<template>
  <div class="container">
    <article v-if="assignment" class="thread">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink :to="{ name: 'home' }">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="{ name: 'assignments' }">作业</RouterLink>
        <span>/</span>
        <span>详情</span>
      </nav>

      <div class="thread-head">
        <div class="tc-top">
          <StatusBadge kind="assignment" :value="assignment.state" />
          <span v-if="assignment.canSubmit" class="tag tag-cat" data-tone="cactus">可提交</span>
          <span v-else class="tag tag-hash">不可提交</span>
        </div>
        <h1>{{ assignment.title }}</h1>
        <div class="meta-rows">
          <span>
            <span class="k">发布者</span>
            <span class="v">{{ assignment.publisher.nickname }}（{{ roleLabel(assignment.publisher.role) }}）</span>
          </span>
          <span>
            <span class="k">开始</span>
            <span class="v">{{ formatDateTime(assignment.startAt) }}</span>
          </span>
          <span>
            <span class="k">截止</span>
            <span class="v">{{ formatDateTime(assignment.deadlineAt) }}</span>
          </span>
          <!-- 倒计时仅展示，能否提交以 canSubmit 为准 -->
          <span class="countdown" :class="{ ended: assignment.state !== 'OPEN' }">
            {{ assignment.state === 'NOT_STARTED' ? '尚未开始' : formatCountdown(assignment.deadlineAt, now) }}
          </span>
        </div>
      </div>

      <div class="post-block">
        <MarkdownBody class="pb-body" :content="assignment.description" />
      </div>

      <section class="composer">
        <h2 style="font-size: 1.25rem; margin-bottom: 0.85rem">提交作业</h2>

        <EmptyState
          v-if="!assignment.canSubmit"
          title="当前不可提交"
          hint="是否可提交由服务器判定，请等待开放或已截止。"
        />

        <template v-else>
          <div class="field" style="margin-bottom: 1rem">
            <label for="submit-note">备注（可选）</label>
            <textarea
              id="submit-note"
              v-model="note"
              style="min-height: 5.5rem"
              placeholder="想让发布者了解的内容，例如运行方式、未完成的部分"
            />
          </div>
          <FileUploader
            :extensions="SUBMIT_EXTENSIONS"
            :upload="submitFile"
            button-text="选择作业文件"
          />
        </template>

        <div v-if="assignment.mySubmission" class="post-block" style="margin-top: 1.25rem">
          <h3 style="font-family: var(--font-sans); font-size: var(--fs-small); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint)">
            我的提交
          </h3>
          <div class="meta-rows">
            <span>
              <span class="k">文件</span>
              <a class="v" :href="assignment.mySubmission.attachment.url" style="color: var(--clay-dark); text-decoration: underline; text-underline-offset: 3px" @click.prevent="download(assignment.mySubmission.attachment)">
                {{ assignment.mySubmission.attachment.originalName }}
              </a>
              （{{ formatSize(assignment.mySubmission.attachment.size) }}）
            </span>
            <span>
              <span class="k">提交时间</span>
              <span class="v">{{ formatDateTime(assignment.mySubmission.createdAt) }}</span>
            </span>
          </div>
          <p v-if="assignment.mySubmission.note" style="margin-top: 0.65rem; color: var(--ink-muted)">
            备注：{{ assignment.mySubmission.note }}
          </p>
        </div>
      </section>

      <!-- 查看提交：仅该作业发布者或管理员（显隐为体验优化，权限以后端为准） -->
      <section v-if="canViewSubmissions" class="replies">
        <div class="replies-head">
          <h2>学生提交（{{ submissionTotal }}）</h2>
        </div>
        <EmptyState v-if="submissions.length === 0" title="还没有提交" />
        <div v-for="(item, index) in submissions" :key="item.id" class="reply">
          <div class="r-head">
            <AppAvatar
              :nickname="item.submitter.nickname"
              :avatar-url="item.submitter.avatarUrl"
              :user-id="item.submitter.id"
            />
            <span class="r-name">{{ item.submitter.nickname }}</span>
            <span class="r-time">{{ timeAgo(item.createdAt) }}</span>
            <span class="r-floor">#{{ index + 1 }}</span>
          </div>
          <div class="r-body">
            <p>
              附件：
              <a :href="item.attachment.url" style="color: var(--clay-dark); text-decoration: underline; text-underline-offset: 3px" @click.prevent="download(item.attachment)">
                {{ item.attachment.originalName }}
              </a>
              （{{ formatSize(item.attachment.size) }}）
            </p>
            <p v-if="item.note">备注：{{ item.note }}</p>
          </div>
        </div>
        <BasePagination
          v-if="submissionTotal > submissionPageSize"
          :page="submissionPage"
          :page-size="submissionPageSize"
          :total="submissionTotal"
          @change="changeSubmissionPage"
        />
      </section>
    </article>

    <div v-else-if="loading" class="empty" style="margin-top: 3rem">加载中…</div>
    <EmptyState v-else-if="error" title="加载失败" :hint="error" />
    <EmptyState v-else title="作业不存在" hint="它可能已被删除。" />
  </div>
</template>
