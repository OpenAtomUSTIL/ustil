import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/403',
  name: 'forbidden',
  component: () => import('@/views/error/ForbiddenView.vue'),
}

export default route
