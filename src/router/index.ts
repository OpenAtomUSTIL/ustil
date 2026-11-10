/* 路由表与守卫
   meta.requiresAuth：未登录跳登录页（登录后回跳 redirect） */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/articles',
      name: 'articles',
      component: () => import('@/views/ArticlesView.vue'),
    },
    {
      path: '/articles/new',
      name: 'article-new',
      component: () => import('@/views/ArticleEditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/articles/:id/edit',
      name: 'article-edit',
      component: () => import('@/views/ArticleEditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/articles/:id',
      name: 'article-detail',
      component: () => import('@/views/ArticleDetailView.vue'),
    },
    {
      path: '/assignments',
      name: 'assignments',
      component: () => import('@/views/AssignmentsView.vue'),
    },
    {
      path: '/assignments/new',
      name: 'assignment-new',
      component: () => import('@/views/AssignmentCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/assignments/:id',
      name: 'assignment-detail',
      component: () => import('@/views/AssignmentDetailView.vue'),
    },
    {
      path: '/issues',
      name: 'issues',
      component: () => import('@/views/IssuesView.vue'),
    },
    {
      path: '/issues/new',
      name: 'issue-new',
      component: () => import('@/views/IssueCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/issues/:id',
      name: 'issue-detail',
      component: () => import('@/views/IssueDetailView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/ForbiddenView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
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
  return true
})

export default router
