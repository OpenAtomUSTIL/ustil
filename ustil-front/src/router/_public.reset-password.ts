import type { RouteRecordRaw } from 'vue-router'

// v12.0：重置密码为公开路由（token 即凭证）——登录态用户点邮件链接也应能重置
const route: RouteRecordRaw = {
  path: '/reset-password',
  name: 'reset-password',
  component: () => import('@/views/auth/ResetPasswordView.vue'),
}

export default route
