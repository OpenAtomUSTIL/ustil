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

    const linkHtml = renderMarkdown('[click](javascript:alert(1))')
    expect(linkHtml).not.toContain('javascript:')
  })

  it('KaTeX 的 MathML 产物不被剥离', () => {
    const html = renderMarkdown('$$x$$')
    expect(html).toContain('<math')
    expect(html).toContain('annotation')
  })

  it('代码块按语言高亮并解析别名', () => {
    const html = renderMarkdown('```ts\nconst x: number = 1\n```')
    expect(html).toContain('class="hljs language-typescript"')
    expect(html).toContain('data-lang="ts"')
    expect(html).toContain('hljs-keyword')
  })

  it('代码块每行包行号 span', () => {
    const html = renderMarkdown('```\na\nb\nc\n```')
    expect(html.match(/md-code-line/g)).toHaveLength(3)
  })

  it('未知语言降级纯文本转义且不崩', () => {
    const html = renderMarkdown('```foobar\na < b & c\n```')
    expect(html).toContain('class="hljs language-foobar"')
    expect(html).toContain('md-code-line')
    expect(html).toContain('a &lt; b &amp; c')
  })

  it('代码内 HTML 转义', () => {
    const html = renderMarkdown('```\n<script>alert(1)</script>\n```')
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('代码块注入复制按钮', () => {
    const html = renderMarkdown('```\nx\n```')
    expect(html).toContain('md-copy')
    expect(html).toContain('复制')
  })
})
