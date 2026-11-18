<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError } from '@/api/error'
import { authApi } from '@/api/request'
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
const emailCodeCountdown = ref(0)
let emailCodeTimer: number | null = null

function startEmailCodeCountdown(): void {
  emailCodeCountdown.value = 60
  emailCodeTimer = window.setInterval(() => {
    emailCodeCountdown.value -= 1
    if (emailCodeCountdown.value <= 0 && emailCodeTimer !== null) {
      window.clearInterval(emailCodeTimer)
      emailCodeTimer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (emailCodeTimer !== null) window.clearInterval(emailCodeTimer)
})

/** 获取邮箱验证码：消费当前图形验证码，成功后刷新图形码供注册提交用 */
async function sendEmailCode(): Promise<void> {
  if (sendingEmailCode.value || emailCodeCountdown.value > 0) return
  error.value = ''
  const emailProblem = checkEmail(identifier.value)
  if (emailProblem) {
    error.value = emailProblem
    return
  }
  if (!captchaCode.value.trim()) {
    error.value = '请先完成图形验证码'
    return
  }
  sendingEmailCode.value = true
  try {
    await authApi.emailCode({
      email: identifier.value.trim(),
      purpose: 'register',
      captchaId: captchaId.value,
      captchaCode: captchaCode.value,
    })
    toast.show('验证码已发送，请查收邮件')
    // 图形验证码一次性消费：刷新一张供注册提交用
    void captchaRef.value?.refresh()
    startEmailCodeCountdown()
  } catch (err) {
    error.value = describeError(err)
    // 图形验证码一次性消费：提交失败后重新拉取
    captchaCode.value = ''
    void captchaRef.value?.refresh()
  } finally {
    sendingEmailCode.value = false
  }
}

async function submit(): Promise<void> {
  if (submitting.value) return
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
    <form class="auth-card" @submit.prevent="submit">
      <h1>注册</h1>
      <p class="lead">使用邮箱注册 USTIL 开放论坛。</p>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-grid">
        <div class="field">
          <label for="reg-identifier">邮箱</label>
          <input id="reg-identifier" v-model="identifier" type="text" autocomplete="email" required placeholder="you@example.com">
          <span class="hint">用于接收注册验证码与邮件通知</span>
        </div>
        <div class="field">
          <label for="reg-email-code">邮箱验证码</label>
          <div class="email-code-row">
            <input id="reg-email-code" v-model="emailCode" type="text" autocomplete="one-time-code" required placeholder="输入收到的验证码">
            <button
              class="btn btn-clay email-code-btn"
              type="button"
              :disabled="sendingEmailCode || emailCodeCountdown > 0"
              @click="sendEmailCode"
            >
              {{ emailCodeCountdown > 0 ? `${emailCodeCountdown} 秒后重发` : (sendingEmailCode ? '发送中…' : '获取验证码') }}
            </button>
          </div>
          <span class="hint">验证码发往填写的邮箱，10 分钟有效</span>
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
.email-code-row {
  display: flex;
  gap: 0.65rem;
  align-items: stretch;
}

.email-code-row input {
  flex: 1;
  min-width: 0;
}

.email-code-btn {
  flex: none;
  white-space: nowrap;
}

/* 窄屏卡片内边距收窄，把宽度留给表单 */
@media (max-width: 480px) {
  .auth-card {
    padding: 1.45rem 1.35rem 1.35rem;
  }
}
</style>
