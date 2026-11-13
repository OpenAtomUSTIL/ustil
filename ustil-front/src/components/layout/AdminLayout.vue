<script setup lang="ts">
/* 管理后台布局：侧边栏 + 子页面出口（入口显隐与角色守卫均为体验优化，权限以后端为准） */
</script>

<template>
  <div class="admin-shell">
    <div class="container">
      <div class="admin-grid">
        <aside class="admin-sidebar">
          <div class="admin-title">管理后台</div>
          <nav class="admin-nav" aria-label="管理导航">
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-dashboard' }">
              <span class="nav-ic" aria-hidden="true">◱</span>概览
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-users' }">
              <span class="nav-ic" aria-hidden="true">◉</span>用户管理
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-invite-codes' }">
              <span class="nav-ic" aria-hidden="true">✦</span>邀请码
            </RouterLink>

            <div class="nav-group-label">内容管理</div>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-article-review' }">
              <span class="nav-ic" aria-hidden="true">✔</span>文章审核
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-announcements' }">
              <span class="nav-ic" aria-hidden="true">✉</span>公告管理
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-resources' }">
              <span class="nav-ic" aria-hidden="true">❖</span>资源管理
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-comments' }">
              <span class="nav-ic" aria-hidden="true">✎</span>评论管理
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-trash' }">
              <span class="nav-ic" aria-hidden="true">↺</span>回收站
            </RouterLink>

            <div class="nav-group-label">运维</div>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-login-logs' }">
              <span class="nav-ic" aria-hidden="true">◷</span>登录日志
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-request-logs' }">
              <span class="nav-ic" aria-hidden="true">↯</span>接口日志
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-audit-logs' }">
              <span class="nav-ic" aria-hidden="true">☰</span>操作日志
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-online-users' }">
              <span class="nav-ic" aria-hidden="true">◍</span>在线用户
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-files' }">
              <span class="nav-ic" aria-hidden="true">▤</span>文件管理
            </RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-api-registry' }">
              <span class="nav-ic" aria-hidden="true">⊞</span>接口总览
            </RouterLink>
          </nav>
          <RouterLink class="admin-back" :to="{ name: 'home' }">← 返回站点</RouterLink>
        </aside>
        <main class="admin-main">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  padding-block: 2.25rem 3.5rem;
  min-height: 60vh;
}

.admin-grid {
  display: grid;
  grid-template-columns: clamp(11rem, 20%, 13.5rem) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.admin-main {
  min-width: 0;
  container-type: inline-size;
}

.admin-sidebar {
  position: sticky;
  top: 5.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1.15rem 0.85rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
}

.admin-title {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  padding: 0.15rem 0.55rem 0.75rem;
  border-bottom: var(--bw-sm) solid var(--border);
  margin-bottom: 0.55rem;
  letter-spacing: 0.02em;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-group-label {
  margin-top: 0.55rem;
  padding: 0.2rem 0.65rem;
  font-size: var(--fs-small);
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  font-weight: var(--fw-semibold);
}

.nav-group-label:first-child {
  margin-top: 0;
}

.admin-nav-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.52rem 0.65rem;
  border-radius: var(--br-8);
  color: var(--ink-muted);
  font-size: var(--fs-meta);
  font-weight: var(--fw-medium);
  border: var(--bw-sm) solid transparent;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease);
}

.admin-nav-link .nav-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  flex: none;
  border-radius: var(--br-6);
  background: var(--gray-150);
  color: var(--ink-muted);
  font-size: 0.78rem;
  line-height: 1;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.admin-nav-link:hover {
  background: var(--gray-150);
  color: var(--ink);
}

.admin-nav-link:hover .nav-ic {
  background: var(--gray-250);
  color: var(--ink);
}

.admin-nav-link.router-link-active {
  background: var(--ink);
  color: var(--ink-inverse);
  border-color: var(--ink);
}

.admin-nav-link.router-link-active .nav-ic {
  background: rgba(250, 249, 245, 0.16);
  color: var(--ink-inverse);
}

.admin-back {
  margin-top: 0.95rem;
  padding: 0.45rem 0.65rem;
  font-size: var(--fs-small);
  color: var(--ink-faint);
  border-radius: var(--br-8);
}

.admin-back:hover {
  color: var(--clay);
  background: var(--gray-100);
}

@media (max-width: 820px) {
  .admin-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-sidebar {
    position: static;
  }

  .admin-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .nav-group-label {
    flex-basis: 100%;
    margin-top: 0.35rem;
  }
}
</style>
