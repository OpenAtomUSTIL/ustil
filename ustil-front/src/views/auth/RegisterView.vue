<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError } from '@/api/error'
import { resolveAuthRedirect } from '@/utils/auth-redirect'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import {
  INVITE_CODE_MAX,
  NICKNAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  checkIdentifier,
  checkNickname,
  checkPassword,
} from '@/utils/limits'
import AuthCaptcha from '@/components/AuthCaptcha.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const identifier = ref('')
const nickname = ref('')
const password = ref('')
const passwordConfirm = ref('')
const inviteCode = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const captchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  error.value = ''
  const identifierProblem = checkIdentifier(identifier.value)
  if (identifierProblem) {
    error.value = identifierProblem
    return
  }
  const nicknameProblem = checkNickname(nickname.value)
  if (nicknameProblem) {
    error.value = nicknameProblem
    return
  }
  const passwordProblem = checkPassword(password.value)
  if (passwordProblem) {
    error.value = passwordProblem
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  submitting.value = true
  try {
    await auth.register({
      identifier: identifier.value.trim(),
      nickname: nickname.value.trim(),
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      inviteCode: inviteCode.value.trim() || undefined,
      captchaId: captchaId.value,
      captchaCode: captchaCode.value,
    })
    toast.show('注册成功，欢迎加入')
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
      <h1>注册</h1>
      <p class="lead">邮箱或手机号任绑其一即可注册。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="field">
          <label for="reg-identifier">邮箱 / 手机号</label>
          <input id="reg-identifier" v-model="identifier" type="text" autocomplete="username" required placeholder="you@example.com 或 手机号">
          <span class="hint">邮箱或手机号任填其一</span>
        </div>
        <div class="field">
          <label for="reg-nickname">昵称</label>
          <input id="reg-nickname" v-model="nickname" type="text" autocomplete="nickname" required :maxlength="NICKNAME_MAX">
        </div>
        <div class="field">
          <label for="reg-password">密码</label>
          <input id="reg-password" v-model="password" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
          <span class="hint">{{ PASSWORD_MIN }}-{{ PASSWORD_MAX }} 位，需包含大写字母、小写字母、数字、符号中的至少两类</span>
        </div>
        <div class="field">
          <label for="reg-password2">确认密码</label>
          <input id="reg-password2" v-model="passwordConfirm" type="password" autocomplete="new-password" required :minlength="PASSWORD_MIN" :maxlength="PASSWORD_MAX">
        </div>
        <div class="field">
          <label for="reg-invite">邀请码（可选）</label>
          <input id="reg-invite" v-model="inviteCode" type="text" :maxlength="INVITE_CODE_MAX" placeholder="持邀请码注册可直接成为学习成员">
          <span class="hint">没有邀请码也可注册，将先成为临时访客</span>
        </div>
        <div class="field">
          <span class="field-legend">验证码</span>
          <AuthCaptcha ref="captchaRef" v-model:captcha-id="captchaId" v-model="captchaCode" />
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

<style scoped>
/* 窄屏卡片内边距收窄，把宽度留给表单 */
@media (max-width: 480px) {
  .auth-card {
    padding: 1.45rem 1.35rem 1.35rem;
  }
}
</style>
