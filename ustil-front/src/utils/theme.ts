/* 深浅色模式：默认跟随系统，用户切换后写入 localStorage 持久化。
   index.html 有同逻辑内联脚本防闪烁；此处负责后续切换与系统偏好变化。 */

import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function readStored(): ThemeMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const themeMode = ref<ThemeMode>(readStored() ?? (systemPrefersDark() ? 'dark' : 'light'))

function apply(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
  themeMode.value = mode
}

export function initTheme(): void {
  apply(themeMode.value)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (readStored() === null) apply(event.matches ? 'dark' : 'light')
  })
}

export function toggleTheme(): void {
  const next: ThemeMode = themeMode.value === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 存储不可用时仅本次会话生效
  }
  apply(next)
}
