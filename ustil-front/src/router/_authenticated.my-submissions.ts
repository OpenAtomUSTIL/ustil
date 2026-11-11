import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/my/submissions',
  name: 'my-submissions',
  component: () => import('@/views/assignment/MySubmissionsView.vue'),
  meta: { requiresAuth: true, requiresRole: ['MEMBER', 'ALUMNI', 'WHEEL', 'ADMIN'] },
}

export default route
