<script setup lang="ts">
/* 资源表单：管理页内联与 /resources/new|:id/edit 共用
   提交由父级调接口；失败原因经 error 传入展示，输入天然保留 */
import { ref, watch } from 'vue'
import type { ResourceCategory, ResourceWriteRequest } from '@/api/types'
import TagInput from '@/components/TagInput.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { RESOURCE_URL_MAX, TITLE_MAX, checkResourceUrl, checkTags, checkTitle } from '@/utils/limits'

const props = defineProps<{
  initial?: { title: string; description: string; url: string; category: ResourceCategory; tags: string[] }
  busy?: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [payload: ResourceWriteRequest]
  cancel: []
}>()

const title = ref('')
const description = ref('')
const url = ref('')
const category = ref<ResourceCategory>('GITHUB')
const tags = ref<string[]>([])
const problem = ref('')

const CATEGORY_OPTIONS: Array<{ value: ResourceCategory; label: string }> = [
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'EXAM', label: '考试题' },
  { value: 'EBOOK', label: '电子书' },
  { value: 'DOCUMENT', label: '电子文档' },
  { value: 'OTHER', label: '其他' },
]

watch(
  () => props.initial,
  (value) => {
    title.value = value?.title ?? ''
    description.value = value?.description ?? ''
    url.value = value?.url ?? ''
    category.value = value?.category ?? 'GITHUB'
    tags.value = value ? [...value.tags] : []
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
  const urlProblem = checkResourceUrl(url.value)
  if (urlProblem) {
    problem.value = urlProblem
    return
  }
  const tagsProblem = checkTags(tags.value)
  if (tagsProblem) {
    problem.value = tagsProblem
    return
  }
  emit('submit', {
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    url: url.value.trim(),
    category: category.value,
    tags: tags.value.length > 0 ? tags.value : undefined,
  })
}
</script>

<template>
  <form class="form-grid resource-form" @submit.prevent="submit">
    <div v-if="problem || error" class="form-error">{{ problem || error }}</div>
    <div class="field">
      <label for="resource-title">标题</label>
      <input
        id="resource-title"
        v-model="title"
        type="text"
        required
        :maxlength="TITLE_MAX"
        placeholder="资源名称"
      >
    </div>
    <div class="field">
      <label for="resource-category">分类</label>
      <select id="resource-category" v-model="category" required>
        <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <div class="field">
      <label for="resource-url">链接</label>
      <input
        id="resource-url"
        v-model="url"
        type="url"
        required
        :maxlength="RESOURCE_URL_MAX"
        placeholder="https://"
      >
    </div>
    <div class="field">
      <label for="resource-description">描述</label>
      <MarkdownEditor
        v-model="description"
        min-height="7rem"
        placeholder="这个资源是什么、适合谁（选填，支持 Markdown）"
      />
    </div>
    <div class="field">
      <span class="field-legend">标签</span>
      <TagInput v-model="tags" />
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" :disabled="busy">
        {{ busy ? '保存中…' : '保存' }}
      </button>
      <button class="btn btn-secondary" type="button" :disabled="busy" @click="emit('cancel')">
        取消
      </button>
    </div>
  </form>
</template>

<style scoped>
.resource-form {
  max-width: 46rem;
}

.field-legend {
  display: block;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  margin-bottom: 0.45rem;
}
</style>
