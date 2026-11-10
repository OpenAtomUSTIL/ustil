import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/login',
  name: 'login',
  component: () => import('@/views/auth/LoginView.vue'),
  meta: { guestOnly: true },
}

export default route
