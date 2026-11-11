import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/announcements/new',
  name: 'announcement-new',
  component: () => import('@/views/announcement/AnnouncementEditorView.vue'),
  meta: { requiresAuth: true, requiresRole: ['WHEEL', 'ADMIN'] },
}

export default route
