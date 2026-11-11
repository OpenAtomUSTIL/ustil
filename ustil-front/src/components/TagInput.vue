<script setup lang="ts">
/* 标签输入：回车/逗号添加、chip 删除、去重，上限走 utils/limits 常量 */
import { ref } from 'vue'
import { TAGS_MAX, TAG_MAX } from '@/utils/limits'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const draft = ref('')
const problem = ref('')

function add(raw: string): void {
  const value = raw.trim().replace(/[,，]$/, '')
  problem.value = ''
  if (!value) return
  if (value.length > TAG_MAX) {
    problem.value = `单个标签不能超过 ${TAG_MAX} 个字符`
    return
  }
  if (props.modelValue.includes(value)) {
    problem.value = '标签已存在'
    return
  }
  if (props.modelValue.length >= TAGS_MAX) {
    problem.value = `标签最多 ${TAGS_MAX} 个`
    return
  }
  emit('update:modelValue', [...props.modelValue, value])
  draft.value = ''
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
    e.preventDefault()
    add(draft.value)
    return
  }
  if (e.key === 'Backspace' && !draft.value && props.modelValue.length > 0) {
    emit('update:modelValue', props.modelValue.slice(0, -1))
  }
}

function remove(tag: string): void {
  emit('update:modelValue', props.modelValue.filter((item) => item !== tag))
}
</script>

<template>
  <div class="tag-input">
    <div class="ti-chips">
      <span v-for="tag in modelValue" :key="tag" class="ti-chip">
        {{ tag }}
        <button type="button" class="ti-remove" :aria-label="`移除标签 ${tag}`" @click="remove(tag)">×</button>
      </span>
    </div>
    <input
      v-model="draft"
      type="text"
      aria-label="添加标签"
      :maxlength="TAG_MAX"
      :placeholder="modelValue.length >= TAGS_MAX ? `已达上限（${TAGS_MAX} 个）` : '输入标签后回车添加'"
      :disabled="modelValue.length >= TAGS_MAX"
      @keydown="onKeydown"
      @blur="add(draft)"
    >
    <div class="ti-foot">
      <span class="hint">{{ modelValue.length }} / {{ TAGS_MAX }} 个 · 每个 ≤ {{ TAG_MAX }} 字符</span>
      <span v-if="problem" class="err">{{ problem }}</span>
    </div>
  </div>
</template>

<style scoped>
.tag-input {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.ti-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.ti-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  padding: 0.18rem 0.55rem 0.18rem 0.72rem;
  border-radius: var(--br-pill);
  border: var(--bw-sm) solid rgba(102, 153, 135, 0.28);
  background: rgba(102, 153, 135, 0.13);
  color: var(--mineral);
  font-size: 0.78rem;
  font-weight: var(--fw-medium);
}

.ti-remove {
  width: 1.15rem;
  height: 1.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--mineral);
  font-size: 0.95rem;
  line-height: 1;
}

.ti-remove:hover {
  background: rgba(102, 153, 135, 0.22);
  color: var(--ink);
}

.tag-input input {
  width: 100%;
  padding: 0.72rem 0.95rem;
  border: var(--bw-sm) solid var(--border-strong);
  border-radius: var(--br-12);
  background: var(--bg-raised);
  font: inherit;
  color: var(--ink);
}

.tag-input input:focus {
  outline: 0;
  border-color: var(--clay);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.16);
}

.tag-input input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ti-foot {
  display: flex;
  gap: 0.85rem;
  font-size: var(--fs-small);
}

.ti-foot .hint {
  color: var(--ink-faint);
}

.ti-foot .err {
  color: var(--error);
}
</style>
