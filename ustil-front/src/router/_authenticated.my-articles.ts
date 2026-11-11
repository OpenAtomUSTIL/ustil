import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/my/articles',
  name: 'my-articles',
  component: () => import('@/views/article/MyArticlesView.vue'),
  meta: { requiresAuth: true },
}

export default route
