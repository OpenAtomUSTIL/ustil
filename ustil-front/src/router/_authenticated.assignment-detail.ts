import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/assignments/:id',
  name: 'assignment-detail',
  component: () => import('@/views/assignment/AssignmentDetailView.vue'),
  meta: { requiresAuth: true },
}

export default route
