import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'api-registry',
  name: 'admin-api-registry',
  component: () => import('@/views/admin/AdminApiRegistryView.vue'),
}

export default route
