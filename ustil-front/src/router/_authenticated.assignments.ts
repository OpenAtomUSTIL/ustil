import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/assignments',
  name: 'assignments',
  component: () => import('@/views/assignment/AssignmentsView.vue'),
  meta: { requiresAuth: true },
}

export default route
