import type { RouteRecordRaw } from 'vue-router'
import adminDashboard from './_admin.dashboard'
import adminInviteCodes from './_admin.invite-codes'
import adminUsers from './_admin.users'

/** 管理后台布局路由：侧边栏 + 子页面；入口仅 WHEEL / ADMIN（显隐为体验优化，权限以后端为准） */
const route: RouteRecordRaw = {
  path: '/admin',
  component: () => import('@/components/layout/AdminLayout.vue'),
  redirect: { name: 'admin-dashboard' },
  meta: { requiresAuth: true, requiresRole: ['WHEEL', 'ADMIN'] },
  children: [adminDashboard, adminUsers, adminInviteCodes],
}

export default route
