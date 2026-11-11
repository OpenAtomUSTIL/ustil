import type { RouteRecordRaw } from 'vue-router'

/** 管理后台子路由（挂载于 _admin 布局路由下，meta.requiresRole 由父级统一声明） */
const route: RouteRecordRaw = {
  path: 'dashboard',
  name: 'admin-dashboard',
  component: () => import('@/views/admin/AdminDashboardView.vue'),
}

export default route
