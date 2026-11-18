<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError } from '@/api/error'
import { resolveAuthRedirect } from '@/utils/auth-redirect'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { PASSWORD_MAX, PASSWORD_MIN, checkPasswordLength } from '@/utils/limits'
import AuthCaptcha from '@/components/AuthCaptcha.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const identifier = ref('')
const password = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const captchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  // 登录仅校验长度（复杂度仅限注册新密码与改密新密码，旧密码可能不满足）
  const passwordProblem = checkPasswordLength(password.value)
  if (passwordProblem) {
    error.value = passwordProblem
    return
  }
  submitting.value = true
  try {
    await auth.login({
      identifier: identifier.value.trim(),
      password: password.value,
      captchaId: captchaId.value,
      captchaCode: captchaCode.value,
    })
    toast.show('登录成功')
    const redirect = resolveAuthRedirect(route.query.redirect, window.location.origin)
    if (redirect.external) window.location.assign(redirect.target)
    else await router.push(redirect.target)
  } catch (err) {
    error.value = describeError(err)
    // 验证码一次性消费：提交失败后重新拉取
    captchaCode.value = ''
    void captchaRef.value?.refresh()
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
          <input id="login-password" v-model="password" type="password" autocomplete="current-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
        </div>
        <div class="field">
          <span class="field-legend">验证码</span>
          <AuthCaptcha ref="captchaRef" v-model:captcha-id="captchaId" v-model="captchaCode" />
        </div>
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </div>

      <p class="auth-switch">
        <RouterLink :to="{ name: 'forgot-password' }">忘记密码？</RouterLink>
      </p>
      <p class="auth-switch">
        还没有账号？
        <RouterLink :to="{ name: 'register' }">注册</RouterLink>
      </p>
    </form>
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
