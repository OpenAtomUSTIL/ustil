<script setup lang="ts">
import { ref } from 'vue'
import { describeError } from '@/api/error'
import { authApi } from '@/api/request'
import { checkEmail } from '@/utils/limits'
import AuthCaptcha from '@/components/AuthCaptcha.vue'

const email = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const captchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const error = ref('')
const submitting = ref(false)
const sent = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  const emailProblem = checkEmail(email.value)
  if (emailProblem) {
    error.value = emailProblem
    return
  }
  submitting.value = true
  try {
    await authApi.forgotPassword({
      identifier: email.value.trim(),
      captchaId: captchaId.value,
      captchaCode: captchaCode.value,
    })
    // 无论账号是否存在均 204（防枚举）：统一提示，不泄露存在性
    sent.value = true
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
    <form v-if="!sent" class="auth-card" @submit.prevent="submit">
      <h1>找回密码</h1>
      <p class="lead">输入注册邮箱，我们将发送重置链接。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="field">
          <label for="fp-email">邮箱</label>
          <input id="fp-email" v-model="email" type="text" autocomplete="email" required placeholder="you@example.com">
        </div>
        <div class="field">
          <span class="field-legend">验证码</span>
          <AuthCaptcha ref="captchaRef" v-model:captcha-id="captchaId" v-model="captchaCode" />
        </div>
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '发送中…' : '发送重置链接' }}
        </button>
      </div>

      <p class="auth-switch">
        想起密码了？
        <RouterLink :to="{ name: 'login' }">登录</RouterLink>
      </p>
    </form>

    <div v-else class="auth-card">
      <h1>请查收邮件</h1>
      <p class="lead">如果该邮箱已注册，我们已发送重置链接，请查收邮件。</p>
      <p class="auth-switch">
        <RouterLink :to="{ name: 'login' }">返回登录</RouterLink>
      </p>
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
