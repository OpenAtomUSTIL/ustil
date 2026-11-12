<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useToastStore } from '@/stores/toast'
import AppAvatar from '@/components/AppAvatar.vue'

const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const toast = useToastStore()


const scrolled = ref(false)
const menuOpen = ref(false)
const publishOpen = ref(false)
const publishItem = ref<HTMLElement | null>(null)

const nickname = computed(() => auth.user?.nickname ?? '')
const avatarUrl = computed(() => auth.user?.avatarUrl ?? '')
const userId = computed(() => auth.user?.id ?? '')
const unreadLabel = computed(() =>
  notifications.unreadCount > 99 ? '99+' : String(notifications.unreadCount),
)

function onScroll(): void {
  scrolled.value = window.scrollY > 8
}

function onDocClick(e: MouseEvent): void {
  if (publishItem.value && !publishItem.value.contains(e.target as Node)) {
    publishOpen.value = false
  }
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', onDocClick)
})

// 进入布局时拉一次未读数；登录/退出时同步
watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) void notifications.refresh()
    else notifications.reset()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', onDocClick)
})

async function logout(): Promise<void> {
  await auth.logout()
  toast.show('已退出登录')
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
    <div class="container">
      <div class="nav-row">
        <RouterLink class="brand" :to="{ name: 'home' }" aria-label="USTIL 开放论坛 首页">
          <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="3.1" fill="currentColor" />
            <ellipse cx="16" cy="16" rx="13" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.9" transform="rotate(28 16 16)" />
            <ellipse cx="16" cy="16" rx="13" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.9" transform="rotate(-28 16 16)" />
            <circle cx="27.2" cy="10.2" r="2.1" fill="currentColor" />
          </svg>
          <span>USTIL 开放论坛<small>OpenAtom Campus Chapter</small></span>
        </RouterLink>

        <button
          class="nav-toggle"
          type="button"
          :aria-expanded="menuOpen"
          aria-controls="nav-main"
          :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
          @click="menuOpen = !menuOpen"
        >
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>

        <nav id="nav-main" class="nav-main" :class="{ open: menuOpen }" aria-label="主导航">
          <RouterLink class="nav-link" :to="{ name: 'home' }">首页</RouterLink>
          <RouterLink class="nav-link" :to="{ name: 'articles' }">文章</RouterLink>
          <RouterLink v-if="auth.canViewAssignments" class="nav-link" :to="{ name: 'assignments' }">作业</RouterLink>
          <RouterLink class="nav-link" :to="{ name: 'issues' }">讨论</RouterLink>

          <!-- 发布入口显隐仅为体验优化，权限以后端为准 -->
          <div v-if="auth.canCreateIssue" ref="publishItem" class="nav-item" :class="{ open: publishOpen }">
            <button
              class="nav-trigger"
              type="button"
              :aria-expanded="publishOpen"
              aria-haspopup="true"
              @click="publishOpen = !publishOpen"
            >
              发布
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m2 5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div class="dropdown" role="menu">
              <div class="dd-title">创建内容</div>
              <RouterLink role="menuitem" :to="{ name: 'issue-new' }" @click="publishOpen = false">
                发起讨论<span>提出问题、分享进展</span>
              </RouterLink>
              <RouterLink v-if="auth.canPublishArticle" role="menuitem" :to="{ name: 'article-new' }" @click="publishOpen = false">
                发布文章<span>面向社区的技术长文</span>
              </RouterLink>
              <RouterLink v-if="auth.canManageContent" role="menuitem" :to="{ name: 'assignment-new' }" @click="publishOpen = false">
                发布作业<span>布置练习与提交任务</span>
              </RouterLink>
            </div>
          </div>
          <div class="nav-footer">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">辽ICP备2026004720号</a>
          </div>
        </nav>

        <div class="nav-actions">
          <template v-if="auth.isLoggedIn">
            <RouterLink v-if="auth.canAccessAdmin" class="btn btn-ghost" :to="{ name: 'admin-dashboard' }">
              管理后台
            </RouterLink>
            <RouterLink class="btn btn-ghost bell-btn" :to="{ name: 'notifications' }" aria-label="通知">
              <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3a6 6 0 0 0-6 6v3.6l-1.5 2.9a.8.8 0 0 0 .7 1.2h13.6a.8.8 0 0 0 .7-1.2L18 12.6V9a6 6 0 0 0-6-6Z"
                  fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"
                />
                <path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              <span v-if="notifications.unreadCount > 0" class="bell-badge">{{ unreadLabel }}</span>
            </RouterLink>
            <RouterLink class="btn btn-ghost" title="个人中心" :to="{ name: 'user-profile', params: { id: auth.user?.id } }">
              <AppAvatar :nickname="nickname" :avatar-url="avatarUrl" :user-id="userId" />
              {{ nickname }}
            </RouterLink>
            <button class="btn btn-ghost" type="button" @click="logout">退出</button>
          </template>
          <template v-else>
            <RouterLink class="btn btn-ghost" :to="{ name: 'login' }">登录</RouterLink>
            <RouterLink class="btn btn-clay" :to="{ name: 'register' }">注册</RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.bell-btn {
  position: relative;
}

.bell-btn .ic {
  width: 1.15em;
  height: 1.15em;
}

.bell-badge {
  position: absolute;
  top: 0.15rem;
  right: 0.15rem;
  min-width: 1.05rem;
  height: 1.05rem;
  padding: 0 0.28rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--br-pill);
  background: var(--clay);
  color: var(--gray-000);
  font-size: 0.62rem;
  font-weight: var(--fw-semibold);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.nav-footer {
  display: none;
  padding: 0.65rem 0 0.15rem;
  border-top: 1px solid var(--border);
  margin-top: 0.55rem;
}

.nav-footer a {
  font-size: var(--fs-meta);
  color: var(--ink-faint);
  text-decoration: none;
}

.nav-footer a:hover {
  color: var(--clay-soft);
}

@media (max-width: 820px) {
  .nav-footer {
    display: block;
  }
}
</style>
