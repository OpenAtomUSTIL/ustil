import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/issues',
  name: 'issues',
  component: () => import('@/views/issue/IssuesView.vue'),
  meta: { requiresAuth: true },
}

export default route
