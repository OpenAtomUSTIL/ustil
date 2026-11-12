// @vitest-environment jsdom
// DOMPurify 需要规范的 DOM 实现：happy-dom 的 Node.prototype.nodeName 返回空串、
// NodeIterator 在节点被移除后中断遍历，导致 DOMPurify 误删合法元素且漏删 XSS 载荷。
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  it('渲染行内公式为 KaTeX 结构', () => {
    const html = renderMarkdown('质能方程 $E=mc^2$ 成立')
    expect(html).toContain('class="katex"')
    expect(html).toContain('E=mc')
  })

  it('紧挨中文的行内公式也可解析', () => {
    const html = renderMarkdown('公式$x^2$紧挨中文')
    expect(html).toContain('class="katex"')
  })

  it('渲染块级公式为 KaTeX 展示结构', () => {
    const html = renderMarkdown('$$\n\\int_0^1 x^2 dx\n$$')
    expect(html).toContain('katex-display')
  })

  it('代码块内的 $ 不按公式解析', () => {
    const html = renderMarkdown('```\n$not math$\n```')
    expect(html).toContain('$not math$')
    expect(html).not.toContain('katex')
  })

  it('错误公式不抛错并显示错误样式', () => {
    const source = '$\\frac{$'
    expect(() => renderMarkdown(source)).not.toThrow()
    expect(renderMarkdown(source)).toContain('katex-error')
  })

  it('XSS 载荷被消毒', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
  })

  it('KaTeX 的 MathML 产物不被剥离', () => {
    const html = renderMarkdown('$$x$$')
    expect(html).toContain('<math')
    expect(html).toContain('annotation')
  })
})
