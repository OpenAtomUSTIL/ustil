import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/resources',
  name: 'resources',
  component: () => import('@/views/resource/ResourcesView.vue'),
  meta: { requiresAuth: true },
}

export default route
