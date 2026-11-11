import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'files',
  name: 'admin-files',
  component: () => import('@/views/admin/AdminFilesView.vue'),
}

export default route
