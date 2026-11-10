import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/articles/:id/edit',
  name: 'article-edit',
  component: () => import('@/views/article/ArticleEditorView.vue'),
  meta: { requiresAuth: true },
}

export default route
