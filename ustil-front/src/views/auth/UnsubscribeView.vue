<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { describeError } from '@/api/error'
import { authApi } from '@/api/request'

const route = useRoute()

/** 退订令牌来自邮件链接 /unsubscribe?token=xxx */
const token = typeof route.query.token === 'string' ? route.query.token : ''

const state = ref<'loading' | 'done' | 'failed'>(token ? 'loading' : 'failed')
/** 失效态默认文案；接口失败时展示后端文案（契约失败即「链接无效或已过期」） */
const failedMessage = ref('链接无效或已过期')

onMounted(async () => {
  if (!token) return
  try {
    await authApi.unsubscribe({ token })
    state.value = 'done'
  } catch (err) {
    failedMessage.value = describeError(err)
    state.value = 'failed'
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <template v-if="state === 'loading'">
        <h1>退订</h1>
        <p class="lead">处理中…</p>
      </template>
      <template v-else-if="state === 'done'">
        <h1>已关闭邮件提醒</h1>
        <p class="lead">你已成功退订邮件提醒，之后不会再收到通知邮件。</p>
        <p class="auth-switch">
          <RouterLink :to="{ name: 'home' }">返回论坛</RouterLink>
        </p>
      </template>
      <template v-else>
        <h1>退订失败</h1>
        <p class="lead">{{ failedMessage }}</p>
        <p class="auth-switch">
          <RouterLink :to="{ name: 'home' }">返回论坛</RouterLink>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 窄屏卡片内边距收窄，把宽度留给表单 */
@media (max-width: 480px) {
  .auth-card {
    padding: 1.45rem 1.35rem 1.35rem;
  }
}
</style>
