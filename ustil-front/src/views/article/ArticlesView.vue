<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeError, isForbidden } from '@/api/error'
import { articlesApi } from '@/api/request'
import type { ArticleListItem } from '@/api/types'
import ArticleCard from '@/components/ArticleCard.vue'
import BasePagination from '@/components/BasePagination.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const items = ref<ArticleListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const loading = ref(true)
const error = ref('')

function queryPage(): number {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
}

function queryKeyword(): string {
  return typeof route.query.keyword === 'string' ? route.query.keyword : ''
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await articlesApi.list({
      page: queryPage(),
      pageSize,
      keyword: queryKeyword() || undefined,
    })
    items.value = result.items
    total.value = result.total
    page.value = result.page
    keyword.value = queryKeyword()
  } catch (err) {
    if (isForbidden(err)) {
      void router.push({ name: 'forbidden' })
      return
    }
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function search(): void {
  void router.push({
    name: 'articles',
    query: { keyword: keyword.value.trim() || undefined, page: 1 },
  })
}

function changePage(next: number): void {
  void router.push({
    name: 'articles',
    query: { keyword: queryKeyword() || undefined, page: next },
  })
}

watch(() => route.fullPath, load)
onMounted(load)
</script>

<template>
  <div class="container">
    <div class="layout single">
      <main>
        <div class="section-head">
          <h2>文章</h2>
          <span class="hint">共 {{ total }} 篇</span>
        </div>

        <form class="search-box" role="search" @submit.prevent="search">
          <input v-model="keyword" type="search" placeholder="搜索文章标题或内容…" aria-label="搜索文章">
          <button class="btn btn-secondary" type="submit">搜索</button>
        </form>

        <div style="height: 1.5rem" />

        <div v-if="loading" class="empty">加载中…</div>
        <EmptyState v-else-if="error" title="加载失败" :hint="error" />
        <EmptyState v-else-if="items.length === 0" title="没有找到匹配的文章" hint="换个关键词，或者稍后再来。">
          <p v-if="keyword" style="margin-top: 1.15rem">
            <button class="btn btn-secondary" type="button" @click="keyword = ''; search()">清除筛选</button>
          </p>
        </EmptyState>
        <div v-else class="topic-list">
          <ArticleCard v-for="article in items" :key="article.id" :article="article" />
        </div>

        <BasePagination
          v-if="!loading && !error && total > 0"
          :page="page"
          :page-size="pageSize"
          :total="total"
          @change="changePage"
        />
      </main>
    </div>
  </div>
</template>
