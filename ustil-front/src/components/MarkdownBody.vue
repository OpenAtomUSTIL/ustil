<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ content: string }>()

const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <!-- 渲染产物已经 DOMPurify 消毒 -->
  <div class="md-body" v-html="html" />
</template>
