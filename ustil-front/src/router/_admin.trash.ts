import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'trash',
  name: 'admin-trash',
  component: () => import('@/views/admin/AdminTrashView.vue'),
}

export default route
