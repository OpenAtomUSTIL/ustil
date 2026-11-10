<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import AppAvatar from '@/components/AppAvatar.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const scrolled = ref(false)
const menuOpen = ref(false)
const publishOpen = ref(false)
const publishItem = ref<HTMLElement | null>(null)

const nickname = computed(() => auth.user?.nickname ?? '')
const avatarUrl = computed(() => auth.user?.avatarUrl ?? '')
const userId = computed(() => auth.user?.id ?? '')

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
          <RouterLink class="nav-link" :to="{ name: 'assignments' }">作业</RouterLink>
          <RouterLink class="nav-link" :to="{ name: 'issues' }">讨论</RouterLink>

          <!-- 发布入口显隐仅为体验优化，权限以后端为准 -->
          <div v-if="auth.isLoggedIn" ref="publishItem" class="nav-item" :class="{ open: publishOpen }">
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
              <RouterLink v-if="auth.canManageContent" role="menuitem" :to="{ name: 'article-new' }" @click="publishOpen = false">
                发布文章<span>面向社区的技术长文</span>
              </RouterLink>
              <RouterLink v-if="auth.canManageContent" role="menuitem" :to="{ name: 'assignment-new' }" @click="publishOpen = false">
                发布作业<span>布置练习与提交任务</span>
              </RouterLink>
            </div>
          </div>
        </nav>

        <div class="nav-actions">
          <template v-if="auth.isLoggedIn">
            <RouterLink class="btn btn-ghost" :to="{ name: 'profile' }" title="个人中心">
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
