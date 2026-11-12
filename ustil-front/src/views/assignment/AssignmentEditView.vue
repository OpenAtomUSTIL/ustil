<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { assignmentsApi } from '@/api/request'
import { useToastStore } from '@/stores/toast'
import { toDatetimeLocalValue } from '@/utils/format'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { TITLE_MAX, checkTitle } from '@/utils/limits'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const assignmentId = computed(() => String(route.params.id))

const title = ref('')
const description = ref('')
const startAt = ref('')
const deadlineAt = ref('')
const error = ref('')
const loading = ref(true)
const submitting = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const assignment = await assignmentsApi.get(assignmentId.value)
    title.value = assignment.title
    description.value = assignment.description
    // ISO 8601 UTC → datetime-local 本地值，回填后可直接继续编辑
    startAt.value = toDatetimeLocalValue(assignment.startAt)
    deadlineAt.value = toDatetimeLocalValue(assignment.deadlineAt)
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

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''

  const titleProblem = checkTitle(title.value)
  if (titleProblem) {
    error.value = titleProblem
    return
  }

  const start = new Date(startAt.value)
  const deadline = new Date(deadlineAt.value)
  if (Number.isNaN(start.getTime()) || Number.isNaN(deadline.getTime())) {
    error.value = '请填写开始与截止时间'
    return
  }
  if (deadline.getTime() <= start.getTime()) {
    error.value = '截止时间必须晚于开始时间'
    return
  }

  if (!description.value.trim()) {
    error.value = '请填写任务说明'
    return
  }

  submitting.value = true
  try {
    // 本地时间选择器 → ISO 8601 UTC 字符串提交给后端；失败保留输入并展示原因
    await assignmentsApi.update(assignmentId.value, {
      title: title.value.trim(),
      description: description.value,
      startAt: start.toISOString(),
      deadlineAt: deadline.toISOString(),
    })
    toast.show('作业已更新')
    await router.push({ name: 'assignment-detail', params: { id: assignmentId.value } })
  } catch (err) {
    error.value = describeError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container compose-page">
    <h1>编辑作业</h1>
    <p class="lead">修改任务说明与时间窗口。提交窗口由服务端按开始/截止时间判定。</p>

    <div v-if="error" class="form-error" style="max-width: 46rem">{{ error }}</div>
    <div v-if="loading" class="empty" style="max-width: 46rem">加载中…</div>

    <form v-else class="form-grid" @submit.prevent="submit">
      <div class="field">
        <label for="assignment-title">标题</label>
        <input id="assignment-title" v-model="title" type="text" required :maxlength="TITLE_MAX" placeholder="例如：第三周练习 —— 实现一个简易词法分析器">
      </div>
      <div class="field">
        <label>任务说明（Markdown）</label>
        <MarkdownEditor
          v-model="description"
          aria-label="任务说明（Markdown）"
          min-height="14rem"
          placeholder="说明任务目标、要求与提交物格式"
        />
      </div>
      <div class="field">
        <label for="assignment-start">开始时间（本地时区）</label>
        <input id="assignment-start" v-model="startAt" type="datetime-local" required>
        <div class="hint">将以 UTC 时间提交给后端，展示时转回本地时区</div>
      </div>
      <div class="field">
        <label for="assignment-deadline">截止时间（本地时区）</label>
        <input id="assignment-deadline" v-model="deadlineAt" type="datetime-local" required>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : '保存修改' }}
        </button>
        <button class="btn btn-secondary btn-lg" type="button" @click="router.back()">取消</button>
      </div>
    </form>
  </div>
</template>
