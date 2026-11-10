/* 轻量 Toast 状态（组件只读 store，不直接操作 DOM） */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
}

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])
  let seq = 0

  function dismiss(id: number): void {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function show(message: string): void {
    const id = ++seq
    items.value.push({ id, message })
    setTimeout(() => dismiss(id), 2600)
  }

  return { items, show, dismiss }
})
