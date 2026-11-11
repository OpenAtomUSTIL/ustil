import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'resources',
  name: 'admin-resources',
  component: () => import('@/views/admin/AdminResourcesView.vue'),
}

export default route
