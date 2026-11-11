import type { RouteRecordRaw } from 'vue-router'

const route: RouteRecordRaw = {
  path: 'invite-codes',
  name: 'admin-invite-codes',
  component: () => import('@/views/admin/AdminInviteCodesView.vue'),
}

export default route
