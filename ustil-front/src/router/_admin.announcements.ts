import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'announcements',
  name: 'admin-announcements',
  component: () => import('@/views/admin/AdminAnnouncementsView.vue'),
}

export default route
