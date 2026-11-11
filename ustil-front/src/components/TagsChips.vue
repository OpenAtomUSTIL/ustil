<script setup lang="ts">
/* 标签展示 chips：点击跳对应列表并带 ?tag= 过滤
   用 button 承载点击（卡片本身是 RouterLink，stop+prevent 避免触发卡片跳转） */
import { useRouter } from 'vue-router'

const props = defineProps<{
  tags: string[]
  /** 目标列表路由名 */
  target: 'articles' | 'issues' | 'resources'
}>()

const router = useRouter()

function go(tag: string): void {
  void router.push({ name: props.target, query: { tag } })
}
</script>

<template>
  <div v-if="tags.length > 0" class="tags-chips">
    <button
      v-for="tag in tags"
      :key="tag"
      class="tags-chip"
      type="button"
      :title="`查看标签「${tag}」的内容`"
      @click.stop.prevent="go(tag)"
    >
      # {{ tag }}
    </button>
  </div>
</template>

<style scoped>
.tags-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tags-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.16rem 0.62rem;
  border-radius: var(--br-pill);
  font-size: 0.75rem;
  font-weight: var(--fw-medium);
  border: var(--bw-sm) solid var(--border);
  background: transparent;
  color: var(--ink-faint);
  transition: all var(--t-fast) var(--ease);
}

.tags-chip:hover {
  border-color: var(--mineral);
  color: var(--mineral);
  background: rgba(102, 153, 135, 0.1);
}
</style>
