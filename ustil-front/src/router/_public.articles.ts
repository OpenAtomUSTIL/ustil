import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/articles',
  name: 'articles',
  component: () => import('@/views/article/ArticlesView.vue'),
}

export default route
