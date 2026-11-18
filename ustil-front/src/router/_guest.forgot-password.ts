import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/forgot-password',
  name: 'forgot-password',
  component: () => import('@/views/auth/ForgotPasswordView.vue'),
  meta: { guestOnly: true },
}

export default route
