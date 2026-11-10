import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('@/views/error/NotFoundView.vue'),
}

export default route
