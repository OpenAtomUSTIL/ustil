import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'request-logs',
  name: 'admin-request-logs',
  component: () => import('@/views/admin/AdminRequestLogsView.vue'),
}

export default route
