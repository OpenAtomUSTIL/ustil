<script setup lang="ts">
import { computed } from 'vue'
import { initialsOf } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    nickname: string
    avatarUrl: string
    userId?: string
    size?: 'sm' | 'lg' | 'xl'
  }>(),
  { size: 'sm', userId: '' },
)

const TONES = ['clay', 'cactus', 'sky', 'plum'] as const

/** 由 id/昵称散列选一个稳定的头像底色 */
const tone = computed(() => {
  const seed = props.userId || props.nickname
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997
  }
  return TONES[hash % TONES.length]
})

const initials = computed(() => initialsOf(props.nickname))
</script>

<template>
  <span
    class="avatar"
    :class="{ lg: size === 'lg', xl: size === 'xl' }"
    :data-tone="tone"
    aria-hidden="true"
  >
    <img v-if="avatarUrl" :src="avatarUrl" :alt="nickname">
    <template v-else>{{ initials }}</template>
  </span>
</template>
