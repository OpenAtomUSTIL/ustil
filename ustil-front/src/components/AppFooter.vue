<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const year = new Date().getFullYear()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

function openProfile(): void {
  if (auth.isLoggedIn) {
    ui.openProfile()
    return
  }
  void router.push({ name: 'login', query: { redirect: '/profile' } })
}
</script>

<template>
  <footer class="site-footer theme-inverse">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <RouterLink class="brand" :to="{ name: 'home' }">
            <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="3.1" fill="currentColor" />
              <ellipse cx="16" cy="16" rx="13" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.9" transform="rotate(28 16 16)" />
              <ellipse cx="16" cy="16" rx="13" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.9" transform="rotate(-28 16 16)" />
              <circle cx="27.2" cy="10.2" r="2.1" fill="currentColor" />
            </svg>
            <span>USTIL 开放论坛<small>OpenAtom Campus Chapter</small></span>
          </RouterLink>
          <p>由学生自主运营的开源社区。所有讨论公开可溯，所有代码开源可复用 —— 包括你正在看的这个页面。</p>
        </div>
        <div class="footer-col">
          <h4>社区</h4>
          <RouterLink :to="{ name: 'home' }">首页</RouterLink>
          <RouterLink :to="{ name: 'articles' }">文章</RouterLink>
          <RouterLink v-if="auth.canViewAssignments" :to="{ name: 'assignments' }">作业</RouterLink>
          <RouterLink :to="{ name: 'issues' }">讨论区</RouterLink>
        </div>
        <div v-if="auth.canCreateIssue" class="footer-col">
          <h4>参与</h4>
          <RouterLink :to="{ name: 'issue-new' }">发起讨论</RouterLink>
          <RouterLink v-if="auth.canManageContent" :to="{ name: 'article-new' }">发布文章</RouterLink>
          <RouterLink v-if="auth.canManageContent" :to="{ name: 'assignment-new' }">发布作业</RouterLink>
        </div>
        <div class="footer-col">
          <h4>账号</h4>
          <RouterLink :to="{ name: 'login' }">登录</RouterLink>
          <RouterLink :to="{ name: 'register' }">注册</RouterLink>
          <button type="button" @click="openProfile">个人中心</button>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ year }} 开放原子 USTIL 学生开源社区 · 内容以 CC BY 4.0 共享</span>
        <span class="links">
          <RouterLink :to="{ name: 'issues' }">社区公约</RouterLink>
          <RouterLink :to="{ name: 'home' }">无障碍</RouterLink>
        </span>
      </div>
    </div>
  </footer>
</template>
