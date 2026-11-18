<script setup lang="ts">
/* 验证码输入：挂载拉取一张（PNG data URI，随当前深浅主题取色），一次性消费，提交失败后由父级调 refresh() 重新拉取 */
import { computed, onMounted, ref, watch } from 'vue'
import { authApi } from '@/api/request'
import { resolvedTheme } from '@/utils/theme'

const props = defineProps<{ captchaId: string; modelValue: string }>()
const emit = defineEmits<{ 'update:captchaId': [value: string]; 'update:modelValue': [value: string] }>()

const image = ref('')
const loading = ref(false)
const failed = ref(false)
/** 请求序号：换主题/连点时只认最新一次响应，过期响应丢弃 */
let loadSeq = 0

const code = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

async function load(): Promise<void> {
  const seq = ++loadSeq
  loading.value = true
  failed.value = false
  try {
    const data = await authApi.getCaptcha(resolvedTheme.value)
    if (seq !== loadSeq) return
    image.value = data.image
    emit('update:captchaId', data.captchaId)
  } catch {
    if (seq !== loadSeq) return
    image.value = ''
    emit('update:captchaId', '')
    failed.value = true
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

/** 换一张 / 提交失败后重拉：旧验证码作废，清空已输入的验证码 */
async function refresh(): Promise<void> {
  emit('update:modelValue', '')
  await load()
}

/** 深浅主题切换：换对应配色的图；图与码绑定，换图即换码，同步清空已输码 */
watch(resolvedTheme, () => {
  void refresh()
})

onMounted(() => {
  void load()
})

defineExpose({ refresh })
</script>

<template>
  <div class="auth-captcha">
    <div class="ac-media">
      <img v-if="image && !failed && !loading" class="ac-img" :src="image" alt="验证码图片">
      <div v-else-if="loading" class="ac-img ac-placeholder" aria-hidden="true" />
      <button v-else type="button" class="ac-img ac-retry" @click="refresh">加载失败，点击重试</button>
      <button type="button" class="ac-refresh" :disabled="loading" @click="refresh">换一张</button>
    </div>
    <input v-model="code" type="text" autocomplete="off" aria-label="验证码" maxlength="16" placeholder="输入验证码" required>
  </div>
</template>

<style scoped>
.auth-captcha {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.ac-media {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.ac-img {
  height: 2.6rem;
  min-width: 7.5rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-8);
  background: var(--bg-raised);
}

img.ac-img {
  width: auto;
}

.ac-placeholder {
  background: var(--bg-sunken);
}

.ac-retry {
  padding: 0 0.75rem;
  font-size: var(--fs-small);
  color: var(--ink-faint);
  text-align: center;
}

.ac-retry:hover {
  border-color: var(--clay);
  color: var(--clay);
}

.ac-refresh {
  font-size: var(--fs-small);
  font-weight: var(--fw-medium);
  color: var(--clay);
}

.ac-refresh:hover {
  text-decoration: underline;
}

.ac-refresh:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.auth-captcha input {
  width: 100%;
  padding: 0.72rem 0.95rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-12);
  background: var(--bg-raised);
  font: inherit;
  color: var(--ink);
  transition: border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease);
}

.auth-captcha input:focus {
  outline: 0;
  border-color: var(--clay);
  box-shadow: 0 0 0 3px var(--ring-focus);
}

@media (max-width: 820px) {
  /* 「换一张」点按高度 ≥40px，与验证码图（2.6rem）等高 */
  .ac-refresh {
    min-height: 2.5rem;
    padding: 0 0.85rem;
  }
  /* scoped font: inherit 特异性压过全局 .field input 16px 锁定，此处补回防 iOS 聚焦缩放 */
  .auth-captcha input {
    font-size: 16px;
  }
}
</style>
