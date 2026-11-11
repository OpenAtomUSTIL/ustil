import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: '/announcements/:id',
  name: 'announcement-detail',
  component: () => import('@/views/announcement/AnnouncementDetailView.vue'),
}

export default route
