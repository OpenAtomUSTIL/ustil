import { describe, expect, it } from 'vitest'
import { checkEmail, checkIdentifier, checkPassword, checkPasswordLength, checkPhone } from '../limits'

describe('checkPassword', () => {
  it('两类字符组合通过（两两组合边界）', () => {
    expect(checkPassword('abcdefg1')).toBeNull() // 小写 + 数字
    expect(checkPassword('ABCDEFG1')).toBeNull() // 大写 + 数字
    expect(checkPassword('abcdefg!')).toBeNull() // 小写 + 符号
    expect(checkPassword('abcdABCD')).toBeNull() // 大写 + 小写
    expect(checkPassword('1234ABCD')).toBeNull() // 数字 + 大写
    expect(checkPassword('!!!!aaaa')).toBeNull() // 符号 + 小写
  })

  it('三类及以上字符组合通过', () => {
    expect(checkPassword('abcdeFg1')).toBeNull() // 小写 + 大写 + 数字
    expect(checkPassword('Abcdef1!')).toBeNull() // 四类齐全
  })

  it('单类字符拒绝', () => {
    expect(checkPassword('abcdefgh')).toContain('至少两类')
    expect(checkPassword('ABCDEFGH')).toContain('至少两类')
    expect(checkPassword('12345678')).toContain('至少两类')
    expect(checkPassword('!!!!!!!!')).toContain('至少两类')
    expect(checkPassword('        ')).toContain('至少两类')
  })

  it('长度边界：7 位拒绝、8 位通过、128 位通过、129 位拒绝', () => {
    expect(checkPassword('abcde1f')).toContain('长度') // 7 位
    expect(checkPassword('abcde1fg')).toBeNull() // 8 位
    expect(checkPassword(`a1${'x'.repeat(126)}`)).toBeNull() // 128 位
    expect(checkPassword(`a1${'x'.repeat(127)}`)).toContain('长度') // 129 位
  })
})

describe('checkPasswordLength', () => {
  it('仅校验长度，不校验复杂度', () => {
    expect(checkPasswordLength('abcdefgh')).toBeNull() // 单类但长度合规
    expect(checkPasswordLength('abc')).toContain('长度')
    expect(checkPasswordLength('a'.repeat(129))).toContain('长度')
    expect(checkPasswordLength('a'.repeat(128))).toBeNull()
  })
})

describe('checkEmail', () => {
  it('合法邮箱通过', () => {
    expect(checkEmail('you@example.com')).toBeNull()
    expect(checkEmail('user.name+tag@sub.example.com')).toBeNull()
  })

  it('非法邮箱拒绝', () => {
    expect(checkEmail('bad')).not.toBeNull()
    expect(checkEmail('a@b')).not.toBeNull()
    expect(checkEmail('@example.com')).not.toBeNull()
    expect(checkEmail('you@example.')).not.toBeNull()
    expect(checkEmail('you @example.com')).not.toBeNull()
    expect(checkEmail('')).not.toBeNull()
  })
})

describe('checkPhone', () => {
  it('合法手机号通过', () => {
    expect(checkPhone('13800138000')).toBeNull()
    expect(checkPhone('19912345678')).toBeNull()
    expect(checkPhone('15800138000')).toBeNull()
  })

  it('非法手机号拒绝', () => {
    expect(checkPhone('12800138000')).not.toBeNull() // 第二位 2 不在 3-9
    expect(checkPhone('23800138000')).not.toBeNull() // 非 1 开头
    expect(checkPhone('1380013800')).not.toBeNull() // 10 位
    expect(checkPhone('138001380000')).not.toBeNull() // 12 位
    expect(checkPhone('')).not.toBeNull()
  })
})

describe('checkIdentifier', () => {
  it('邮箱或手机号任一通过即通过', () => {
    expect(checkIdentifier('you@example.com')).toBeNull()
    expect(checkIdentifier('13800138000')).toBeNull()
    expect(checkIdentifier('you@example.com ')).toBeNull() // 容忍首尾空白
  })

  it('两者皆非时拒绝并提示可填邮箱或手机号', () => {
    const problem = checkIdentifier('garbage')
    expect(problem).not.toBeNull()
    expect(problem).toContain('邮箱')
    expect(problem).toContain('手机号')
  })
})
