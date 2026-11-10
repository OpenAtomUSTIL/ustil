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
const nickname = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    await auth.register({
      identifier: identifier.value.trim(),
      nickname: nickname.value.trim(),
      password: password.value,
    })
    toast.show('注册成功，欢迎加入')
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
      <h1>注册</h1>
      <p class="lead">邮箱或手机号任绑其一即可注册。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="field">
          <label for="reg-identifier">邮箱 / 手机号</label>
          <input id="reg-identifier" v-model="identifier" type="text" autocomplete="username" required placeholder="you@example.com 或 手机号">
        </div>
        <div class="field">
          <label for="reg-nickname">昵称</label>
          <input id="reg-nickname" v-model="nickname" type="text" autocomplete="nickname" required maxlength="30">
        </div>
        <div class="field">
          <label for="reg-password">密码</label>
          <input id="reg-password" v-model="password" type="password" autocomplete="new-password" required>
        </div>
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '注册中…' : '注册' }}
        </button>
      </div>

      <p class="auth-switch">
        已有账号？
        <RouterLink :to="{ name: 'login' }">登录</RouterLink>
      </p>
    </form>
  </div>
</template>
