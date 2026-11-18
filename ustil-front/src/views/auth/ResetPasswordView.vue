<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { describeError } from '@/api/error'
import { authApi } from '@/api/request'
import { PASSWORD_MAX, PASSWORD_MIN, checkPassword } from '@/utils/limits'

const route = useRoute()

/** 重置令牌来自邮件链接 /reset-password?token=xxx */
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const newPassword = ref('')
const newPassword2 = ref('')
const error = ref('')
const submitting = ref(false)
const done = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  const passwordProblem = checkPassword(newPassword.value)
  if (passwordProblem) {
    error.value = passwordProblem
    return
  }
  if (newPassword.value !== newPassword2.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  submitting.value = true
  try {
    await authApi.resetPassword({
      token: token.value,
      newPassword: newPassword.value,
      newPasswordConfirm: newPassword2.value,
    })
    done.value = true
  } catch (err) {
    // 失败 400「链接无效或已过期」（后端契约文案）
    error.value = describeError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <form v-if="token && !done" class="auth-card" @submit.prevent="submit">
      <h1>重置密码</h1>
      <p class="lead">设置新密码后即可用新密码登录。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="field">
          <label for="rp-new">新密码</label>
          <input id="rp-new" v-model="newPassword" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
          <span class="hint">{{ PASSWORD_MIN }}-{{ PASSWORD_MAX }} 位，需包含大写字母、小写字母、数字、符号中的至少两类</span>
        </div>
        <div class="field">
          <label for="rp-new2">确认新密码</label>
          <input id="rp-new2" v-model="newPassword2" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
        </div>
        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting">
          {{ submitting ? '提交中…' : '重置密码' }}
        </button>
      </div>
    </form>

    <div v-else-if="done" class="auth-card">
      <h1>密码已重置</h1>
      <p class="lead">请使用新密码登录。</p>
      <p class="auth-switch">
        <RouterLink :to="{ name: 'login' }">去登录</RouterLink>
      </p>
    </div>

    <div v-else class="auth-card">
      <h1>重置密码</h1>
      <p class="lead">链接无效或已过期。</p>
      <p class="auth-switch">
        重新发起找回密码？
        <RouterLink :to="{ name: 'forgot-password' }">找回密码</RouterLink>
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
