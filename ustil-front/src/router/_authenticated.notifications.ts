import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/notifications',
  name: 'notifications',
  component: () => import('@/views/notification/NotificationsView.vue'),
  meta: { requiresAuth: true },
}

export default route
