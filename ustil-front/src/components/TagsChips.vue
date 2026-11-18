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
  /* 浮到 topic-card 拉伸标题链接（::after 覆盖整卡）之上，chip 才能点到自己的跳转 */
  position: relative;
  z-index: 1;
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
  background: var(--tint-mineral-bg);
}

@media (max-width: 820px) {
  /* 点按目标 ≥40px：chip 加 padding，再用 ::after 外扩热区（不越出 0.4rem 的间隙） */
  .tags-chip {
    padding: 0.4rem 0.75rem;
  }

  .tags-chip::after {
    content: '';
    position: absolute;
    inset: -0.4rem;
  }
}
</style>
