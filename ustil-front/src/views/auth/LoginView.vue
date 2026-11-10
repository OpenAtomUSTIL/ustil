<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError } from '@/api/error'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const identifier = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    await auth.login({ identifier: identifier.value.trim(), password: password.value })
    toast.show('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (err) {
    error.value = describeError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>登录</h1>
      <p class="lead">使用邮箱或手机号登录 USTIL 开放论坛。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="field">
          <label for="login-identifier">邮箱 / 手机号</label>
          <input id="login-identifier" v-model="identifier" type="text" autocomplete="username" required placeholder="you@example.com 或 手机号">
        </div>
        <div class="field">
          <label for="login-password">密码</label>
          <input id="login-password" v-model="password" type="password" autocomplete="current-password" required>
        </div>
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </div>

      <p class="auth-switch">
        还没有账号？
        <RouterLink :to="{ name: 'register' }">注册</RouterLink>
      </p>
    </form>
  </div>
</template>
