<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { authApi } from '@/api/request'
import { describeError } from '@/api/error'
import { checkEmail } from '@/utils/limits'
import AuthCaptcha from './AuthCaptcha.vue'

const props = defineProps<{ email: string; purpose: 'register' | 'rebind' | 'password'; inputId: string; disabled?: boolean }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const code = defineModel<string>({ required: true })
const captchaId = ref('')
const captchaCode = ref('')
const captcha = ref<InstanceType<typeof AuthCaptcha> | null>(null)
const sending = ref(false)
const sentTo = ref('')
const error = ref('')
const showChallenge = ref(true)
const now = ref(Date.now())
const sentAt = new Map<string, number>()
const email = computed(() => props.email.trim().toLowerCase())
const countdown = computed(() => Math.max(0, Math.ceil(((sentAt.get(email.value) ?? 0) + 60000 - now.value) / 1000)))
const sentForCurrentEmail = computed(() => sentTo.value === email.value && !!sentTo.value)
const timer = window.setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => window.clearInterval(timer))
watch(email, () => {
  code.value = ''
  error.value = ''
  showChallenge.value = true
  captchaCode.value = ''
})

async function send(): Promise<void> {
  if (props.disabled || sending.value || countdown.value > 0) return
  error.value = ''
  if (!showChallenge.value) {
    showChallenge.value = true
    await captcha.value?.refresh()
    return
  }
  const problem = checkEmail(props.email)
  if (problem) { error.value = problem; return }
  if (!captchaId.value || !captchaCode.value.trim()) {
    error.value = '请先填写上方图形验证码，再发送邮件'
    return
  }
  const target = email.value
  sending.value = true
  emit('busy', true)
  try {
    await authApi.emailCode({ email: target, purpose: props.purpose, captchaId: captchaId.value, captchaCode: captchaCode.value })
    sentAt.set(target, Date.now())
    now.value = Date.now()
    if (email.value === target) {
      sentTo.value = target
      code.value = ''
      showChallenge.value = false
    }
  } catch (err) {
    if (email.value === target) error.value = describeError(err)
  } finally {
    // 邮件拉码与最终提交使用不同图形码，不再互相消费或刷新。
    await captcha.value?.refresh()
    sending.value = false
    emit('busy', false)
  }
}
</script>

<template>
  <div class="email-verification">
    <div v-show="showChallenge" class="email-challenge">
      <span class="field-legend">发送邮件前的图形校验</span>
      <AuthCaptcha ref="captcha" v-model:captcha-id="captchaId" v-model="captchaCode" :required="false" :disabled="sending || disabled" />
    </div>
    <div class="field">
      <label :for="inputId">邮箱验证码</label>
      <div class="email-code-row">
        <input :id="inputId" v-model="code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required placeholder="6 位数字" :disabled="disabled || sending">
        <button class="btn btn-secondary" type="button" :disabled="disabled || sending || countdown > 0" @click="send">
          {{ sending ? '发送中…' : countdown > 0 ? `${countdown} 秒后重发` : sentForCurrentEmail && !showChallenge ? '重新获取' : '发送验证码' }}
        </button>
      </div>
      <p v-if="sentForCurrentEmail" class="verification-status" role="status">验证码已提交发送至 <strong>{{ sentTo }}</strong>，10 分钟内有效。未收到时请检查垃圾邮件。</p>
      <p v-else class="hint">完成图形校验后发送邮件，再填写邮箱中的 6 位验证码。</p>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.email-verification { min-width: 0; display: grid; gap: 1rem; container-type: inline-size; }
.email-challenge { padding-block-end: 1rem; border-bottom: 1px solid var(--border); }
.email-code-row { display: flex; gap: 0.65rem; align-items: stretch; }
.email-code-row input { flex: 1 1 8rem; width: 0; min-width: 0; letter-spacing: 0.1em; }
.email-code-row .btn { flex: 0 0 auto; }
.verification-status { margin-top: 0.6rem; font-size: var(--fs-small); color: var(--ink-muted); overflow-wrap: anywhere; }
.verification-status strong { font-weight: var(--fw-semibold); }
@container (max-width: 18rem) {
  .email-code-row { flex-direction: column; }
  .email-code-row input { width: 100%; flex-basis: auto; }
  .email-code-row .btn { width: 100%; }
}
</style>
