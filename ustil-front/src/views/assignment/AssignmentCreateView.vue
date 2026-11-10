<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { assignmentsApi } from '@/api/request'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toast = useToastStore()

const title = ref('')
const description = ref('')
const startAt = ref('')
const deadlineAt = ref('')
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''

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

  submitting.value = true
  try {
    // 本地时间选择器 → ISO 8601 UTC 字符串提交给后端
    await assignmentsApi.create({
      title: title.value.trim(),
      description: description.value,
      startAt: start.toISOString(),
      deadlineAt: deadline.toISOString(),
    })
    toast.show('作业已发布')
    await router.push({ name: 'assignments' })
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    error.value = describeError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container compose-page">
    <h1>发布作业</h1>
    <p class="lead">填写任务说明与时间窗口。提交窗口由服务端按开始/截止时间判定。</p>

    <div v-if="error" class="form-error" style="max-width: 46rem">{{ error }}</div>

    <form class="form-grid" @submit.prevent="submit">
      <div class="field">
        <label for="assignment-title">标题</label>
        <input id="assignment-title" v-model="title" type="text" required maxlength="120" placeholder="例如：第三周练习 —— 实现一个简易词法分析器">
      </div>
      <div class="field">
        <label for="assignment-description">任务说明（Markdown）</label>
        <textarea
          id="assignment-description"
          v-model="description"
          required
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
          {{ submitting ? '发布中…' : '发布作业' }}
        </button>
        <button class="btn btn-secondary btn-lg" type="button" @click="router.back()">取消</button>
      </div>
    </form>
  </div>
</template>
