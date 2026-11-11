import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/assignments/:id/edit',
  name: 'assignment-edit',
  component: () => import('@/views/assignment/AssignmentEditView.vue'),
  meta: { requiresAuth: true },
}

export default route
