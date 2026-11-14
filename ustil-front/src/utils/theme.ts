/* 深浅色模式：light / dark / system 三态，默认跟随系统；
   index.html 有同逻辑内联脚本防闪烁；跨标签页经 storage 事件同步。 */

import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function readStored(): ThemeMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : null
  } catch {
    return null
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 用户偏好（三态）；null 未持久化时等价 'system' */
export const themeMode = ref<ThemeMode>(readStored() ?? 'system')

const systemDark = ref(systemPrefersDark())

/** 实际生效的主题（system 解析后），组件按此取色/换资源 */
export const resolvedTheme = computed<ResolvedTheme>(() => {
  if (themeMode.value === 'system') return systemDark.value ? 'dark' : 'light'
  return themeMode.value
})

function apply(): void {
  document.documentElement.dataset.theme = resolvedTheme.value
}

function persist(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // 存储不可用时仅本次会话生效
  }
}

export function initTheme(): void {
  apply()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    systemDark.value = event.matches
    if (themeMode.value === 'system') apply()
  })
  // 跨标签页同步：他标签页改主题后本页即时跟随
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    themeMode.value = readStored() ?? 'system'
    apply()
  })
}

export function setTheme(mode: ThemeMode): void {
  themeMode.value = mode
  persist(mode)
  apply()
}

/** 三态循环：浅色 → 深色 → 跟随系统 */
export function cycleTheme(): void {
  const next: ThemeMode = themeMode.value === 'light' ? 'dark' : themeMode.value === 'dark' ? 'system' : 'light'
  setTheme(next)
}
