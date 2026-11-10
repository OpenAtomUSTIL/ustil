/* 应用入口：挂载 Pinia / Router，注册 401 统一跳登录 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { setUnauthorizedHandler } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import '@/styles/tokens.css'
import '@/styles/app.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 401 统一触发重新登录（由请求层调用，页面不各写一遍）
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  auth.clear()
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    void router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
})

void router.isReady().then(() => {
  app.mount('#app')
})
