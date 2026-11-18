import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/unsubscribe',
  name: 'unsubscribe',
  component: () => import('@/views/auth/UnsubscribeView.vue'),
}

export default route
