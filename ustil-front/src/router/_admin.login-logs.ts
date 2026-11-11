import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'login-logs',
  name: 'admin-login-logs',
  component: () => import('@/views/admin/AdminLoginLogsView.vue'),
}

export default route
