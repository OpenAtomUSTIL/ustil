/* 全局 UI 状态：个人中心抽屉开合（覆盖层，不走路由，主视图不被替换） */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const profileOpen = ref(false)

  function openProfile(): void {
    profileOpen.value = true
  }

  function closeProfile(): void {
    profileOpen.value = false
  }

  return { profileOpen, openProfile, closeProfile }
})
