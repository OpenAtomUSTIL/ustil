<script setup lang="ts">
/* 公告表单：管理页内联与 /announcements/new|edit 共用
   提交由父级调接口；失败原因经 error 传入展示，输入天然保留 */
import { ref, watch } from 'vue'
import type { AnnouncementCreateRequest, AnnouncementUpdateRequest } from '@/api/types'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { TITLE_MAX, checkTitle } from '@/utils/limits'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: { title: string; content: string; pinned: boolean }
  busy?: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [payload: AnnouncementCreateRequest | AnnouncementUpdateRequest]
  cancel: []
}>()

const title = ref('')
const content = ref('')
const pinned = ref(false)
const notify = ref(false)
const problem = ref('')

watch(
  () => props.initial,
  (value) => {
    title.value = value?.title ?? ''
    content.value = value?.content ?? ''
    pinned.value = value?.pinned ?? false
  },
  { immediate: true, deep: true },
)

function submit(): void {
  problem.value = ''
  const titleProblem = checkTitle(title.value)
  if (titleProblem) {
    problem.value = titleProblem
    return
  }
  if (!content.value.trim()) {
    problem.value = '请填写公告内容'
    return
  }
  if (props.mode === 'create') {
    emit('submit', {
      title: title.value.trim(),
      content: content.value,
      pinned: pinned.value,
      notify: notify.value,
    })
  } else {
    emit('submit', {
      title: title.value.trim(),
      content: content.value,
      pinned: pinned.value,
    })
  }
}
</script>

<template>
  <form class="form-grid announcement-form" @submit.prevent="submit">
    <div v-if="problem || error" class="form-error">{{ problem || error }}</div>
    <div class="field">
      <label for="announcement-title">标题</label>
      <input
        id="announcement-title"
        v-model="title"
        type="text"
        required
        :maxlength="TITLE_MAX"
        placeholder="公告标题"
      >
    </div>
    <div class="field">
      <label>内容（Markdown）</label>
      <MarkdownEditor
        v-model="content"
        aria-label="内容（Markdown）"
        min-height="12rem"
        placeholder="支持 **粗体**、`代码`、> 引用、列表与链接。空行分段。"
      />
      <div class="hint">支持 Markdown 语法，发布后按 Markdown 渲染。</div>
    </div>
    <div class="field checks">
      <label class="check">
        <input v-model="pinned" type="checkbox">
        置顶（展示在公告栏最前）
      </label>
      <label v-if="mode === 'create'" class="check">
        <input v-model="notify" type="checkbox">
        通知全体成员
      </label>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" :disabled="busy">
        {{ busy ? '保存中…' : mode === 'create' ? '发布公告' : '保存修改' }}
      </button>
      <button class="btn btn-secondary" type="button" :disabled="busy" @click="emit('cancel')">
        取消
      </button>
    </div>
  </form>
</template>

<style scoped>
.announcement-form {
  max-width: 56rem;
}

.checks {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: var(--fs-meta);
  font-weight: var(--fw-regular);
  margin: 0;
  cursor: pointer;
}

.check input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--clay);
}
</style>
