import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/articles/new',
  name: 'article-new',
  component: () => import('@/views/article/ArticleEditorView.vue'),
  meta: { requiresAuth: true },
}

export default route
