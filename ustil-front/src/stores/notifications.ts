/* 通知未读数共享状态：进入布局拉一次，通知页刷新，标记已读后本地递减 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsApi } from '@/api/request'

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0)

  /** 拉取未读数（角标非关键路径，失败静默） */
  async function refresh(): Promise<void> {
    try {
      const result = await notificationsApi.unreadCount()
      unreadCount.value = result.count
    } catch {
      /* 静默 */
    }
  }

  function decrement(n = 1): void {
    unreadCount.value = Math.max(0, unreadCount.value - n)
  }

  function reset(): void {
    unreadCount.value = 0
  }

  return { unreadCount, refresh, decrement, reset }
})
