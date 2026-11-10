import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/register',
  name: 'register',
  component: () => import('@/views/auth/RegisterView.vue'),
  meta: { guestOnly: true },
}

export default route
