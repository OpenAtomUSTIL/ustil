import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/issues/new',
  name: 'issue-new',
  component: () => import('@/views/issue/IssueCreateView.vue'),
  meta: { requiresAuth: true },
}

export default route
