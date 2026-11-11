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
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-dashboard' }">概览</RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-users' }">用户管理</RouterLink>
            <RouterLink class="admin-nav-link" :to="{ name: 'admin-invite-codes' }">邀请码</RouterLink>
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
  grid-template-columns: 12.5rem minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.admin-sidebar {
  position: sticky;
  top: 5.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1.1rem 0.9rem;
  background: var(--bg-raised);
  border: var(--bw-sm) solid var(--border);
  border-radius: var(--br-12);
}

.admin-title {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  padding: 0.15rem 0.55rem 0.7rem;
  border-bottom: var(--bw-sm) solid var(--border);
  margin-bottom: 0.45rem;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-nav-link {
  padding: 0.5rem 0.65rem;
  border-radius: var(--br-8);
  color: var(--ink-muted);
  font-size: var(--fs-meta);
}

.admin-nav-link:hover {
  background: var(--gray-150);
  color: var(--ink);
}

.admin-nav-link.router-link-active {
  background: var(--ink);
  color: var(--ink-inverse);
}

.admin-back {
  margin-top: 0.85rem;
  padding: 0.45rem 0.65rem;
  font-size: var(--fs-small);
  color: var(--ink-faint);
}

.admin-back:hover {
  color: var(--clay);
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
}
</style>
