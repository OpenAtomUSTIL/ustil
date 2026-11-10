import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/profile',
  name: 'profile',
  component: () => import('@/views/profile/ProfileView.vue'),
  meta: { requiresAuth: true },
}

export default route
