import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/announcements',
  name: 'announcements',
  component: () => import('@/views/announcement/AnnouncementsView.vue'),
}

export default route
