import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/search',
  name: 'search',
  component: () => import('@/views/search/SearchView.vue'),
  meta: { requiresAuth: true },
}

export default route
