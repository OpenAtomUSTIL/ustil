import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/issues/:id',
  name: 'issue-detail',
  component: () => import('@/views/issue/IssueDetailView.vue'),
  meta: { requiresAuth: true },
}

export default route
