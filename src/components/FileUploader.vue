<script setup lang="ts">
import { ref } from 'vue'
import { formatSize } from '@/utils/format'
import { MAX_UPLOAD_BYTES, validateUploadFile } from '@/utils/upload'

const props = withDefaults(
  defineProps<{
    /** 上传实现（内部调用 src/api/request.ts 的接口封装），返回结果由调用方在闭包里处理 */
    upload: (file: File, onProgress: (percent: number) => void) => Promise<unknown>
    extensions: readonly string[]
    maxSizeBytes?: number
    buttonText?: string
    disabled?: boolean
  }>(),
  {
    maxSizeBytes: MAX_UPLOAD_BYTES,
    buttonText: '选择文件并上传',
    disabled: false,
  },
)

const emit = defineEmits<{ uploaded: []; selected: [file: File | null] }>()

const inputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const error = ref('')
const uploading = ref(false)
const progress = ref(0)
const done = ref(false)

function pickFile(): void {
  if (props.disabled || uploading.value) return
  inputRef.value?.click()
}

function onFileChange(e: Event): void {
  const target = e.target as HTMLInputElement
  const picked = target.files?.[0] ?? null
  file.value = picked
  done.value = false
  progress.value = 0
  error.value = picked ? (validateUploadFile(picked, props.extensions, props.maxSizeBytes) ?? '') : ''
  emit('selected', picked)
  // 允许重复选择同一文件
  target.value = ''
}

async function startUpload(): Promise<void> {
  const picked = file.value
  if (!picked || uploading.value || props.disabled) return

  // 前端预检只是提前提示，后端仍会按同样规则拒收
  const invalid = validateUploadFile(picked, props.extensions, props.maxSizeBytes)
  if (invalid) {
    error.value = invalid
    return
  }

  error.value = ''
  uploading.value = true
  progress.value = 0
  try {
    await props.upload(picked, (percent) => {
      progress.value = percent
    })
    done.value = true
    emit('uploaded')
  } catch (err) {
    // 失败必须给出原因，禁止无反馈
    error.value = err instanceof Error ? err.message : '上传失败，请稍后重试'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="uploader">
    <div class="up-row">
      <button type="button" class="btn btn-secondary" :disabled="disabled || uploading" @click="pickFile">
        {{ buttonText }}
      </button>
      <span v-if="file" class="up-name">{{ file.name }}</span>
      <span v-if="file" class="up-size">{{ formatSize(file.size) }}</span>
      <button
        v-if="file"
        type="button"
        class="btn btn-primary"
        :disabled="disabled || uploading || Boolean(error)"
        @click="startUpload"
      >
        {{ uploading ? '上传中…' : '上传' }}
      </button>
    </div>

    <input
      ref="inputRef"
      class="sr-only"
      type="file"
      :accept="extensions.map((e) => `.${e}`).join(',')"
      @change="onFileChange"
    >

    <div v-if="uploading || progress > 0" class="progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
      <div class="bar" :style="{ width: `${progress}%` }" />
    </div>
    <div v-if="uploading || progress > 0" class="progress-text">上传进度 {{ progress }}%</div>

    <p class="up-hint">
      支持 {{ extensions.join(' / ') }}，单文件不超过 {{ Math.round(maxSizeBytes / 1024 / 1024) }}MB（前端校验仅为提前提示，以后端校验为准）
    </p>
    <p v-if="error" class="up-err">{{ error }}</p>
    <p v-if="done && !error" class="up-ok">上传成功</p>
  </div>
</template>
