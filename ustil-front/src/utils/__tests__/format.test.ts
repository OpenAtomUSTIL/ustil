import { describe, expect, it } from 'vitest'
import { externalHref } from '../format'

describe('externalHref', () => {
  it('http/https 原样透传', () => {
    expect(externalHref('https://geminimortal.cn')).toBe('https://geminimortal.cn')
    expect(externalHref('http://geminimortal.cn/a')).toBe('http://geminimortal.cn/a')
    expect(externalHref('HTTPS://GEMINIMORTAL.CN')).toBe('HTTPS://GEMINIMORTAL.CN')
  })

  it('裸域名自动补 https:// 前缀', () => {
    expect(externalHref('geminimortal.cn')).toBe('https://geminimortal.cn')
    expect(externalHref('  geminimortal.cn/path  ')).toBe('https://geminimortal.cn/path')
    expect(externalHref('www.example.com')).toBe('https://www.example.com')
  })

  it('其他协议（如 javascript:）一律补前缀，不放行直出', () => {
    expect(externalHref('javascript:alert(1)')).toBe('https://javascript:alert(1)')
    expect(externalHref('ftp://x.cn')).toBe('https://ftp://x.cn')
  })
})
