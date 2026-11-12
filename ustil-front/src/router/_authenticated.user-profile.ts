import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/users/:id',
  name: 'user-profile',
  component: () => import('@/views/profile/UserProfileView.vue'),
  meta: { requiresAuth: true },
}

export default route
