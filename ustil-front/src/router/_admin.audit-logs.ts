import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'audit-logs',
  name: 'admin-audit-logs',
  component: () => import('@/views/admin/AdminAuditLogsView.vue'),
}

export default route
