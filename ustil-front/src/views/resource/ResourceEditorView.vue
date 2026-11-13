<script setup lang="ts">
/* 资源新建/编辑独立页：编辑回填 GET /resources/:id；保存失败保留输入并展示原因 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { resourcesApi } from '@/api/request'
import type { ResourceCategory, ResourceItem, ResourceWriteRequest } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import ResourceForm from '@/components/ResourceForm.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const isEdit = computed(() => route.name === 'resource-edit')
const resourceId = computed(() => String(route.params.id ?? ''))

const initial = ref<{
  title: string
  description: string
  url: string
  category: ResourceCategory
  tags: string[]
} | null>(null)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const formError = ref('')

onMounted(async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const item: ResourceItem = await resourcesApi.get(resourceId.value)
    // 旧 id 链接 → 301 到 slug 规范地址
    if (route.params.id !== item.slug) {
      void router.replace({ name: 'resource-edit', params: { id: item.slug } })
    }
    initial.value = {
      title: item.title,
      description: item.description ?? '',
      url: item.url,
      category: item.category,
      tags: [...item.tags],
    }
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    loadError.value = describeError(err)
  } finally {
    loading.value = false
  }
})

async function submit(payload: ResourceWriteRequest): Promise<void> {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (isEdit.value) {
      await resourcesApi.update(resourceId.value, payload)
      toast.show('资源已更新')
    } else {
      await resourcesApi.create(payload)
      toast.show('资源已创建')
    }
    await router.push({ name: 'resources' })
  } catch (err) {
    // 保存失败保留输入，403 等后端原因原样展示
    formError.value = describeError(err)
  } finally {
    saving.value = false
  }
}

function cancel(): void {
  router.back()
}
</script>

<template>
  <div class="container compose-page">
    <h1>{{ isEdit ? '编辑资源' : '新建资源' }}</h1>
    <p class="lead">收录对社区有用的仓库、题库、电子书与文档，标注分类与标签便于检索。</p>

    <div v-if="loading" class="empty" style="max-width: 46rem">加载中…</div>
    <EmptyState v-else-if="loadError" title="加载失败" :hint="loadError">
      <p style="margin-top: 1.15rem">
        <button class="btn btn-secondary" type="button" @click="router.back()">返回</button>
      </p>
    </EmptyState>
    <ResourceForm
      v-else
      :initial="initial ?? undefined"
      :busy="saving"
      :error="formError"
      @submit="submit"
      @cancel="cancel"
    />
  </div>
</template>
