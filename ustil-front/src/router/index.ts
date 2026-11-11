/* 路由表与守卫
   每个路由一个文件（同目录），此处直接引入并组装
   _admin.<name>.ts           — 管理后台子路由（布局与角色守卫在 _admin.ts）
   _authenticated.<name>.ts — meta.requiresAuth 的受保护路由
   _guest.<name>.ts         — meta.guestOnly 的游客路由（登录/注册）
   _public.<name>.ts        — 公开路由
   meta.requiresAuth：未登录跳登录页（登录后回跳 redirect）
   meta.guestOnly：已登录用户访问登录/注册页跳回首页
   meta.requiresRole：角色不匹配跳 403（仅体验优化，权限以后端为准） */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import home from './_authenticated.home'
import login from './_guest.login'
import register from './_guest.register'
import articles from './_public.articles'
import articleNew from './_authenticated.article-new'
import articleEdit from './_authenticated.article-edit'
import myArticles from './_authenticated.my-articles'
import articleDetail from './_public.article-detail'
import assignments from './_public.assignments'
import assignmentNew from './_authenticated.assignment-new'
import assignmentEdit from './_authenticated.assignment-edit'
import assignmentDetail from './_public.assignment-detail'
import mySubmissions from './_authenticated.my-submissions'
import issues from './_public.issues'
import issueNew from './_authenticated.issue-new'
import issueDetail from './_public.issue-detail'
import announcements from './_public.announcements'
import announcementNew from './_authenticated.announcement-new'
import announcementEdit from './_authenticated.announcement-edit'
import announcementDetail from './_public.announcement-detail'
import resources from './_public.resources'
import resourceNew from './_authenticated.resources-new'
import resourceEdit from './_authenticated.resources-edit'
import notifications from './_authenticated.notifications'
import profile from './_authenticated.profile'
import admin from './_admin'
import forbidden from './_public.forbidden'
import notFound from './_public.not-found'

const routes: RouteRecordRaw[] = [
  home,
  login,
  register,
  articles,
  articleNew,
  articleEdit,
  myArticles,
  articleDetail,
  assignments,
  assignmentNew,
  assignmentEdit,
  assignmentDetail,
  mySubmissions,
  issues,
  issueNew,
  issueDetail,
  announcements,
  announcementNew,
  announcementEdit,
  announcementDetail,
  resources,
  resourceNew,
  resourceEdit,
  notifications,
  profile,
  admin,
  forbidden,
  notFound,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureReady()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }
  const requiredRole = to.meta.requiresRole as string[] | undefined
  if (requiredRole && (auth.role === null || !requiredRole.includes(auth.role))) {
    return { name: 'forbidden' }
  }
  return true
})

export default router
