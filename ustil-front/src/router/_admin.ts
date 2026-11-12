import type { RouteRecordRaw } from 'vue-router'
import adminDashboard from './_admin.dashboard'
import adminInviteCodes from './_admin.invite-codes'
import adminUsers from './_admin.users'
import adminAnnouncements from './_admin.announcements'
import adminResources from './_admin.resources'
import adminComments from './_admin.comments'
import adminTrash from './_admin.trash'
import adminAuditLogs from './_admin.audit-logs'
import adminRequestLogs from './_admin.request-logs'
import adminLoginLogs from './_admin.login-logs'
import adminOnlineUsers from './_admin.online-users'
import adminFiles from './_admin.files'
import adminApiRegistry from './_admin.api-registry'
import adminArticleReview from './_admin.article-review'

/** 管理后台布局路由：侧边栏 + 子页面；入口仅 WHEEL / ADMIN（显隐为体验优化，权限以后端为准） */
const route: RouteRecordRaw = {
  path: '/admin',
  component: () => import('@/components/layout/AdminLayout.vue'),
  redirect: { name: 'admin-dashboard' },
  meta: { requiresAuth: true, requiresRole: ['WHEEL', 'ADMIN'] },
  children: [
    adminDashboard,
    adminUsers,
    adminInviteCodes,
    adminAnnouncements,
    adminResources,
    adminComments,
    adminTrash,
    adminAuditLogs,
    adminRequestLogs,
    adminLoginLogs,
    adminOnlineUsers,
    adminFiles,
    adminApiRegistry,
    adminArticleReview,
  ],
}

export default route
