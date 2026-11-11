import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/announcements/:id/edit',
  name: 'announcement-edit',
  component: () => import('@/views/announcement/AnnouncementEditorView.vue'),
  meta: { requiresAuth: true, requiresRole: ['WHEEL', 'ADMIN'] },
}

export default route
