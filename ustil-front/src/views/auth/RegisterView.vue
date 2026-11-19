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
  checkEmail,
  checkNickname,
  checkPassword,
} from '@/utils/limits'
import AuthCaptcha from '@/components/AuthCaptcha.vue'
import EmailVerification from '@/components/EmailVerification.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const identifier = ref('')
const emailCode = ref('')
const nickname = ref('')
const password = ref('')
const passwordConfirm = ref('')
const inviteCode = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const captchaRef = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const error = ref('')
const submitting = ref(false)
const sendingEmailCode = ref(false)

// 邀请链接直达（/register?invite=CODE）：预填邀请码
const inviteParam = typeof route.query.invite === 'string' ? route.query.invite.trim() : ''
const inviteFromLink = inviteParam.length > 0
if (inviteFromLink) {
  inviteCode.value = inviteParam.slice(0, INVITE_CODE_MAX)
}
async function submit(): Promise<void> {
  if (submitting.value || sendingEmailCode.value) return
  error.value = ''
  const emailProblem = checkEmail(identifier.value)
  if (emailProblem) {
    error.value = emailProblem
    return
  }
  if (!emailCode.value.trim()) {
    error.value = '请填写邮箱验证码'
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
  if (!captchaId.value || !captchaCode.value.trim()) {
    error.value = '请完成提交注册前的安全校验'
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
      emailCode: emailCode.value.trim(),
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
    <form class="auth-card register-card" @submit.prevent="submit">
      <h1>创建账号</h1>
      <p class="lead">使用邮箱注册 USTIL 开放论坛。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="form-divider">
          <h2>邮箱验证</h2>
          <p class="hint">填写邮箱并完成验证，用于接收注册验证码与邮件通知。</p>
        </div>
        <div class="field">
          <label for="reg-identifier">邮箱</label>
          <input id="reg-identifier" v-model="identifier" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" :disabled="submitting || sendingEmailCode">
        </div>
        <EmailVerification v-model="emailCode" :email="identifier" purpose="register" input-id="reg-email-code" :disabled="submitting || sendingEmailCode" @busy="sendingEmailCode = $event" />

        <div class="form-divider">
          <h2>账号资料</h2>
          <p class="hint">填写昵称与密码，完成账号创建。</p>
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
          <input id="reg-invite" v-model="inviteCode" type="text" :maxlength="INVITE_CODE_MAX" placeholder="输入邀请码">
          <span class="hint">{{ inviteFromLink ? '已从邀请链接自动填入，可修改' : '没有邀请码也可注册，将先成为临时访客' }}</span>
        </div>

        <template v-if="/^[0-9]{6}$/.test(emailCode)">
          <div class="form-divider">
            <h2>安全校验</h2>
            <p class="hint">注册前的最后一步图形校验，确认操作者是本人。</p>
          </div>
          <div class="field">
            <AuthCaptcha ref="captchaRef" v-model:captcha-id="captchaId" v-model="captchaCode" :disabled="submitting || sendingEmailCode" />
          </div>
        </template>

        <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting || sendingEmailCode">
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
.register-card { max-width: 32rem; }
.form-divider { border-top: 1px solid var(--border); padding-top: 1.4rem; margin-top: 0.25rem; }
.form-divider h2 { font-family: var(--font-sans); font-size: 1.05rem; font-weight: var(--fw-semibold); margin-bottom: 0.4rem; }
/* 全局 .hint 只覆盖 .field 内；节头提示在此补齐同款样式 */
.form-divider .hint { font-size: var(--fs-small); color: var(--ink-faint); line-height: 1.65; }
@media (max-width: 480px) {
  .register-card { padding: 1.5rem 1.15rem; }
}
</style>
