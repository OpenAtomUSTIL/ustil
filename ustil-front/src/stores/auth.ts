/* 登录态唯一来源：Pinia auth store
   - token 在 httpOnly cookie，JS 不可读，禁止存 localStorage / sessionStorage / 持久化插件
   - 刷新页面后经 GET /auth/me 恢复登录态 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/request'
import type { LoginRequest, RegisterRequest, UserSelf } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserSelf | null>(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  /** 内容创作入口显隐（体验优化，权限以后端为准） */
  const canManageContent = computed(
    () => user.value?.role === 'ADMIN' || user.value?.role === 'ALUMNI' || user.value?.role === 'WHEEL',
  )
  /** 管理后台入口显隐（体验优化，权限以后端为准） */
  const canAccessAdmin = computed(
    () => user.value?.role === 'ADMIN' || user.value?.role === 'WHEEL',
  )

  function setUser(next: UserSelf | null): void {
    user.value = next
  }

  function clear(): void {
    user.value = null
  }

  /** 首次进入 / 刷新后恢复登录态（/auth/me 401 视为未登录，不跳转） */
  async function ensureReady(): Promise<void> {
    if (ready.value) return
    try {
      user.value = await authApi.me()
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function login(payload: LoginRequest): Promise<void> {
    user.value = await authApi.login(payload)
  }

  async function register(payload: RegisterRequest): Promise<void> {
    user.value = await authApi.register(payload)
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      user.value = null
    }
  }

  return {
    user,
    ready,
    isLoggedIn,
    role,
    isAdmin,
    canManageContent,
    canAccessAdmin,
    setUser,
    clear,
    ensureReady,
    login,
    register,
    logout,
  }
})
