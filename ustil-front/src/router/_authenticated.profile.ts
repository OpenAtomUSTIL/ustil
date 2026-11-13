import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/profile',
  name: 'profile',
  component: () => import('@/views/profile/UserProfileView.vue'),
  meta: { requiresAuth: true },
}

export default route
