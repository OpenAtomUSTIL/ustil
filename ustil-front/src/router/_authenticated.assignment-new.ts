import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/assignments/new',
  name: 'assignment-new',
  component: () => import('@/views/assignment/AssignmentCreateView.vue'),
  meta: { requiresAuth: true },
}

export default route
