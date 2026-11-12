import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route: RouteRecordRaw = {
  path: '/profile',
  name: 'profile',
  redirect: () => {
    const auth = useAuthStore()
    return { name: 'user-profile', params: { id: auth.user?.id ?? '' } }
  },
  meta: { requiresAuth: true },
}

export default route
