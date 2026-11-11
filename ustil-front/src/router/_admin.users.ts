import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'users',
  name: 'admin-users',
  component: () => import('@/views/admin/AdminUsersView.vue'),
}

export default route
