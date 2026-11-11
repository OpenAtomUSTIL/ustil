import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'online-users',
  name: 'admin-online-users',
  component: () => import('@/views/admin/AdminOnlineUsersView.vue'),
}

export default route
