<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { issuesApi } from '@/api/request'
import { useToastStore } from '@/stores/toast'
import TagInput from '@/components/TagInput.vue'
import { TITLE_MAX, checkTags, checkTitle } from '@/utils/limits'

const router = useRouter()
const toast = useToastStore()

const title = ref('')
const content = ref('')
const tags = ref<string[]>([])
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  const titleProblem = checkTitle(title.value)
  if (titleProblem) {
    error.value = titleProblem
    return
  }
  const tagsProblem = checkTags(tags.value)
  if (tagsProblem) {
    error.value = tagsProblem
    return
  }
  submitting.value = true
  try {
    await issuesApi.create({
      title: title.value.trim(),
      content: content.value,
      tags: tags.value.length > 0 ? tags.value : undefined,
    })
    toast.show('讨论已发布')
    await router.push({ name: 'issues' })
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
    <h1>发起讨论</h1>
    <p class="lead">把问题描述清楚，把上下文补齐 —— 好的问题本身就是一半的答案。</p>

    <div v-if="error" class="form-error" style="max-width: 46rem">{{ error }}</div>

    <form class="form-grid" @submit.prevent="submit">
      <div class="field">
        <label for="issue-title">标题</label>
        <input id="issue-title" v-model="title" type="text" required :maxlength="TITLE_MAX" placeholder="一句话说清你要讨论什么">
        <div class="hint">好的标题包含「对象 + 场景 + 问题」，例如：M1 上交叉编译 RISC-V 内核时链接报错</div>
      </div>
      <div class="field">
        <label for="issue-content">正文（Markdown）</label>
        <textarea
          id="issue-content"
          v-model="content"
          required
          placeholder="支持 **粗体**、`代码`、> 引用。求助请附环境与复现步骤。"
        />
      </div>
      <div class="field">
        <span class="field-legend">标签</span>
        <TagInput v-model="tags" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '发布中…' : '发布' }}
        </button>
        <button class="btn btn-secondary btn-lg" type="button" @click="router.back()">取消</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.field-legend {
  display: block;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  margin-bottom: 0.45rem;
}
</style>
