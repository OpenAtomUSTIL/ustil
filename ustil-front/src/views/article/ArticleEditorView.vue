<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { articlesApi } from '@/api/request'
import { useToastStore } from '@/stores/toast'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import TagInput from '@/components/TagInput.vue'
import { TITLE_MAX, checkTags, checkTitle } from '@/utils/limits'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const isEdit = computed(() => route.name === 'article-edit')
const articleId = computed(() => String(route.params.id ?? ''))

const recordId = ref('')

const title = ref('')
const content = ref('')
const tags = ref<string[]>([])
const error = ref('')
const loading = ref(false)
const submitting = ref(false)

onMounted(async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const article = await articlesApi.get(articleId.value)
    recordId.value = article.id
    // 旧 id 链接 → 301 到 slug 规范地址
    if (route.params.id !== article.slug) {
      void router.replace({ name: 'article-edit', params: { id: article.slug } })
    }
    title.value = article.title
    content.value = article.content
    tags.value = [...(article.tags ?? [])]
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
  const tagsProblem = checkTags(tags.value)
  if (tagsProblem) {
    error.value = tagsProblem
    return
  }
  if (!content.value.trim()) {
    error.value = '正文不能为空'
    return
  }
  submitting.value = true
  try {
    const payload = {
      title: title.value.trim(),
      content: content.value,
      tags: [...tags.value],
    }
    if (isEdit.value) {
      await articlesApi.update(recordId.value, payload)
      toast.show('文章已更新')
      await router.push({ name: 'article-detail', params: { id: articleId.value } })
    } else {
      await articlesApi.create(payload)
      toast.show('文章已发布')
      await router.push({ name: 'articles' })
    }
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
    <h1>{{ isEdit ? '编辑文章' : '发布文章' }}</h1>
    <p class="lead">文章以 Markdown 书写，发布后由前端渲染。</p>

    <div v-if="error" class="form-error" style="max-width: 56rem">{{ error }}</div>
    <div v-if="loading" class="empty" style="max-width: 56rem">加载中…</div>

    <form v-else class="form-grid" @submit.prevent="submit">
      <div class="field">
        <label for="article-title">标题</label>
        <input id="article-title" v-model="title" type="text" required :maxlength="TITLE_MAX" placeholder="一句话说清这篇文章讲什么">
      </div>
      <div class="field">
        <label>正文（Markdown）</label>
        <MarkdownEditor
          v-model="content"
          aria-label="正文（Markdown）"
          min-height="20rem"
          placeholder="支持 **粗体**、`代码`、> 引用、列表与链接。空行分段。"
        />
      </div>
      <div class="field">
        <span class="field-legend">标签</span>
        <TagInput v-model="tags" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '提交中…' : isEdit ? '保存修改' : '发布' }}
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
