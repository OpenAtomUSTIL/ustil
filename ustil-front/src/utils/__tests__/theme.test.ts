// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function matchMediaStub(reduceMotion: boolean): (query: string) => MediaQueryList {
  return (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// theme.ts 模块级读取 matchMedia，须在 import 前装桩
window.matchMedia = matchMediaStub(false)
const { cycleTheme, resolvedTheme, setTheme, themeMode } = await import('../theme')

describe('theme', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.matchMedia = matchMediaStub(false)
    localStorage.clear()
    document.documentElement.classList.remove('theme-anim')
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('setTheme 应用 data-theme 并持久化', () => {
    setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(resolvedTheme.value).toBe('dark')
  })

  it('切换主题挂 theme-anim 过渡类，280ms 后自动移除', () => {
    setTheme('dark')
    expect(document.documentElement.classList.contains('theme-anim')).toBe(true)
    vi.advanceTimersByTime(280)
    expect(document.documentElement.classList.contains('theme-anim')).toBe(false)
  })

  it('连续切换只保留一个过渡计时器，不提前移除', () => {
    setTheme('dark')
    vi.advanceTimersByTime(200)
    setTheme('light')
    vi.advanceTimersByTime(200)
    expect(document.documentElement.classList.contains('theme-anim')).toBe(true)
    vi.advanceTimersByTime(80)
    expect(document.documentElement.classList.contains('theme-anim')).toBe(false)
  })

  it('prefers-reduced-motion 时不挂过渡类', () => {
    window.matchMedia = matchMediaStub(true)
    setTheme('dark')
    expect(document.documentElement.classList.contains('theme-anim')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('cycleTheme 浅 → 深 → 跟随系统 循环', () => {
    setTheme('light')
    cycleTheme()
    expect(themeMode.value).toBe('dark')
    cycleTheme()
    expect(themeMode.value).toBe('system')
    cycleTheme()
    expect(themeMode.value).toBe('light')
  })
})
