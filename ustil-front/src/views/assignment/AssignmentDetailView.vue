<script setup lang="ts">
import { contentPathId } from '@/utils/content-path'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { assignmentsApi } from '@/api/request'
import type { AssignmentItem, AttachmentView, SubmissionView } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatCountdown, formatDateTime, formatSize, roleLabel, timeAgo } from '@/utils/format'
import { downloadAttachmentFile } from '@/utils/download'
import { NOTE_MAX } from '@/utils/limits'
import { SUBMIT_EXTENSIONS } from '@/utils/upload'
import AppAvatar from '@/components/AppAvatar.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import FileUploader from '@/components/FileUploader.vue'
import LoadingState from '@/components/LoadingState.vue'
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
/** 编辑入口：发布者或 ADMIN 且角色属于 ALUMNI / WHEEL / ADMIN（与后端 PATCH 权限一致） */
const canEdit = computed(() => (isPublisher.value || auth.isAdmin) && auth.canManageContent)
/** 软删除作业：WHEEL/ADMIN（显隐为体验优化，权限以后端为准） */
const canDelete = computed(() => auth.canAccessAdmin)

const confirmDelete = ref(false)
const deleting = ref(false)

async function removeAssignment(): Promise<void> {
  if (deleting.value || !assignment.value) return
  deleting.value = true
  try {
    await assignmentsApi.remove(assignment.value.id)
    toast.show('作业已删除，可在后台回收站恢复')
    await router.push({ name: 'assignments' })
  } catch (err) {
    toast.show(describeError(err))
  } finally {
    deleting.value = false
    confirmDelete.value = false
  }
}

async function download(attachment: AttachmentView): Promise<void> {
  try {
    await downloadAttachmentFile(attachment.id, attachment.originalName)
  } catch (err) {
    toast.show(describeError(err))
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    assignment.value = await assignmentsApi.get(assignmentId.value)
    // 旧 id 链接 → 301 到 slug 规范地址
    if (assignment.value && route.params.id !== contentPathId(assignment.value)) {
      void router.replace({ name: 'assignment-detail', params: { id: contentPathId(assignment.value) } })
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

async function loadSubmissions(): Promise<void> {
  if (!canViewSubmissions.value || !assignment.value) return
  try {
    const result = await assignmentsApi.submissions(assignment.value.id, {
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
  if (!assignment.value) return
  await assignmentsApi.submit(
    assignment.value.id,
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

/** 完整加载：详情 + 学生提交（供首载与重试共用） */
async function reload(): Promise<void> {
  await load()
  await loadSubmissions()
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 60_000)
  void reload()
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
            <RouterLink class="v inline-user" :to="{ name: 'user-profile', params: { id: assignment.publisher.username } }">
              {{ assignment.publisher.nickname }}（{{ roleLabel(assignment.publisher.role) }}）
            </RouterLink>
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
        <div v-if="canEdit || canDelete" class="pb-actions">
          <RouterLink
            v-if="canEdit"
            class="btn btn-secondary"
            :to="{ name: 'assignment-edit', params: { id: contentPathId(assignment) } }"
          >
            编辑
          </RouterLink>
          <button
            v-if="canDelete"
            class="btn btn-danger"
            type="button"
            :disabled="deleting"
            @click="confirmDelete = true"
          >
            删除
          </button>
        </div>
      </div>

      <section class="composer">
        <h2 class="submit-head">提交作业</h2>

        <EmptyState
          v-if="!assignment.canSubmit"
          title="当前不可提交"
          hint="是否可提交由服务器判定，请等待开放或已截止。"
        />

        <template v-else>
          <div class="field note-field">
            <label for="submit-note">备注（可选）</label>
            <textarea
              id="submit-note"
              v-model="note"
              class="note-input"
              :maxlength="NOTE_MAX"
              placeholder="想让发布者了解的内容，例如运行方式、未完成的部分"
            />
          </div>
          <FileUploader
            :extensions="SUBMIT_EXTENSIONS"
            :upload="submitFile"
            button-text="选择作业文件"
          />
        </template>

        <div v-if="assignment.mySubmission" class="post-block mine-block">
          <h3 class="mine-title">
            我的提交
          </h3>
          <div class="meta-rows">
            <span>
              <span class="k">文件</span>
              <a class="v file-link" :href="assignment.mySubmission.attachment.url" @click.prevent="download(assignment.mySubmission.attachment)">
                {{ assignment.mySubmission.attachment.originalName }}
              </a>
              （{{ formatSize(assignment.mySubmission.attachment.size) }}）
            </span>
            <span>
              <span class="k">提交时间</span>
              <span class="v">{{ formatDateTime(assignment.mySubmission.createdAt) }}</span>
            </span>
          </div>
          <p v-if="assignment.mySubmission.note" class="mine-note">
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
            <RouterLink class="r-name" :to="{ name: 'user-profile', params: { id: item.submitter.username } }">
              {{ item.submitter.nickname }}
            </RouterLink>
            <span class="r-time">{{ timeAgo(item.createdAt) }}</span>
            <span class="r-floor">#{{ index + 1 }}</span>
          </div>
          <div class="r-body">
            <p>
              附件：
              <a class="file-link" :href="item.attachment.url" @click.prevent="download(item.attachment)">
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

    <LoadingState v-else-if="loading" class="state-gap" />
    <EmptyState v-else-if="error" title="加载失败" :hint="error">
      <button class="btn btn-sm btn-secondary" type="button" @click="reload">重试</button>
    </EmptyState>
    <EmptyState v-else title="作业不存在" hint="它可能已被删除。" />

    <ConfirmModal
      v-if="confirmDelete"
      title="确认删除作业？"
      message="作业将隐藏（他人提交一并不可见），可在后台回收站恢复。"
      confirm-text="删除"
      :busy="deleting"
      @confirm="removeAssignment"
      @cancel="confirmDelete = false"
    />
  </div>
</template>

<style scoped>
/* 提交区（借用全局 .composer 结构，仅补充标题与备注排布） */
.submit-head {
  font-size: 1.25rem;
  margin-bottom: 0.85rem;
}
.note-field {
  margin-bottom: 1rem;
}
.note-input {
  min-height: 5.5rem;
}

/* 我的提交块（借用全局 .post-block 结构，仅收紧间距与标签样式） */
.mine-block {
  margin-top: 1.25rem;
}
.mine-title {
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.mine-note {
  margin-top: 0.65rem;
  color: var(--ink-muted);
}

/* 附件行下载链接（我的提交 / 学生提交共用）；长文件名可断行，窄屏不溢出 */
.file-link {
  color: var(--clay-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}

/* 提交条目头部：长昵称可断行、放不下换行，楼层号保持右对齐 */
.reply .r-head {
  flex-wrap: wrap;
}
.reply .r-name {
  overflow-wrap: anywhere;
}

/* 详情加载块相对容器顶部的留白 */
.state-gap {
  margin-top: 3rem;
}

/* 窄屏触控目标：小按钮点按高度 ≥40px */
@media (max-width: 820px) {
  .btn-sm {
    min-height: 2.5rem;
  }
}
</style>
