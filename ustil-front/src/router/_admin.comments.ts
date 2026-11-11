import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'comments',
  name: 'admin-comments',
  component: () => import('@/views/admin/AdminCommentsView.vue'),
}

export default route
