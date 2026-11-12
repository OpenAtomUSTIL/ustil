import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/articles/:id',
  name: 'article-detail',
  component: () => import('@/views/article/ArticleDetailView.vue'),
  meta: { requiresAuth: true },
}

export default route
