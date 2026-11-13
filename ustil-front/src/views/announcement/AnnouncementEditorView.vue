<script setup lang="ts">
/* 公告新建/编辑独立页：编辑页作者或 ADMIN 才可保存，403 由后端明确报错并原样展示 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { announcementsApi } from '@/api/request'
import type {
  AnnouncementCreateRequest,
  AnnouncementItem,
  AnnouncementUpdateRequest,
} from '@/api/types'
import AnnouncementForm from '@/components/AnnouncementForm.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const isEdit = computed(() => route.name === 'announcement-edit')
const announcementId = computed(() => String(route.params.id ?? ''))

const initial = ref<{ title: string; content: string; pinned: boolean } | null>(null)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const formError = ref('')

onMounted(async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const item: AnnouncementItem = await announcementsApi.get(announcementId.value)
    // 旧 id 链接 → 301 到 slug 规范地址
    if (route.params.id !== item.slug) {
      void router.replace({ name: 'announcement-edit', params: { id: item.slug } })
    }
    initial.value = { title: item.title, content: item.content, pinned: item.pinned }
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

async function submit(
  payload: AnnouncementCreateRequest | AnnouncementUpdateRequest,
): Promise<void> {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (isEdit.value) {
      await announcementsApi.update(announcementId.value, payload)
      toast.show('公告已更新')
      await router.push({ name: 'announcement-detail', params: { id: announcementId.value } })
    } else {
      await announcementsApi.create(payload as AnnouncementCreateRequest)
      toast.show('公告已发布')
      await router.push({ name: 'announcements' })
    }
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
    <h1>{{ isEdit ? '编辑公告' : '发布公告' }}</h1>
    <p class="lead">公告以 Markdown 书写，发布后展示在公告栏与首页。</p>

    <div v-if="loading" class="empty" style="max-width: 46rem">加载中…</div>
    <EmptyState v-else-if="loadError" title="加载失败" :hint="loadError">
      <p style="margin-top: 1.15rem">
        <button class="btn btn-secondary" type="button" @click="router.back()">返回</button>
      </p>
    </EmptyState>
    <AnnouncementForm
      v-else
      :mode="isEdit ? 'edit' : 'create'"
      :initial="initial ?? undefined"
      :busy="saving"
      :error="formError"
      @submit="submit"
      @cancel="cancel"
    />
  </div>
</template>
