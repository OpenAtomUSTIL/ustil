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

  it('跨行 token 切分后标签平衡、类名与换行保留', () => {
    const html = renderMarkdown('```ts\n/* 多行注释\n   第二行 */\nconst x = 1\n```')
    const opens = (html.match(/<span\b/g) ?? []).length
    const closes = (html.match(/<\/span>/g) ?? []).length
    expect(opens).toBeGreaterThan(0)
    expect(opens).toBe(closes)

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const lines = Array.from(doc.querySelectorAll('pre code .md-code-line'))
    expect(lines).toHaveLength(3)
    const firstHalf = lines[0].querySelector('.hljs-comment')
    const secondHalf = lines[1].querySelector('.hljs-comment')
    expect(firstHalf).not.toBeNull()
    expect(secondHalf).not.toBeNull()
    expect(firstHalf?.textContent).toBe('/* 多行注释')
    expect(secondHalf?.textContent).toBe('   第二行 */')
    expect(doc.querySelector('pre code')?.textContent).toBe('/* 多行注释\n   第二行 */\nconst x = 1')
  })

  it('纯图段落标记图行，多图行标记 multi 并保留 align', () => {
    const html = renderMarkdown(
      '<p align="center"><img src="https://x/a.png" alt="a"> <img src="https://x/b.png" alt="b"></p>',
    )
    expect(html).toContain('align="center"')
    expect(html).toContain('md-img-row')
    expect(html).toContain('md-img-row-multi')
  })

  it('单图行只标记图行，图文混排不标记', () => {
    const single = renderMarkdown('<p><img src="https://x/a.png" alt="a"></p>')
    expect(single).toContain('md-img-row')
    expect(single).not.toContain('md-img-row-multi')

    const mixed = renderMarkdown('文字 <img src="https://x/a.png" alt="a"> 文字')
    expect(mixed).not.toContain('md-img-row')
  })

  it('包图链接与 md 图片语法同样标记图行', () => {
    const linked = renderMarkdown(
      '<p><a href="https://x"><img src="https://x/a.png" alt="a"></a> <a href="https://y"><img src="https://x/b.png" alt="b"></a></p>',
    )
    expect(linked).toContain('md-img-row-multi')

    const mdImgs = renderMarkdown('![a](https://x/a.png) ![b](https://x/b.png)')
    expect(mdImgs).toContain('md-img-row-multi')
  })

  it('picture 徽章与普通图片混排同样标记图行', () => {
    const html = renderMarkdown(
      '<p><img src="https://x/a.png" alt="a"><picture><source media="(prefers-color-scheme: dark)" srcset="https://x/b-dark.png"><img src="https://x/b.png" alt="b"></picture> <img src="https://x/c.png" alt="c"></p>',
    )
    expect(html).toContain('md-img-row')
    expect(html).toContain('md-img-row-multi')
    expect(html).toContain('<picture>')
  })

  it('包 picture 的链接徽章与包图链接同样标记图行', () => {
    const html = renderMarkdown(
      '<p><a href="https://x"><img src="https://x/a.png" alt="a"></a> <a href="https://y"><picture><img src="https://x/b.png" alt="b"></picture></a></p>',
    )
    expect(html).toContain('md-img-row-multi')
  })

  it('br 分隔的图段落按行拆分为多个图行', () => {
    const source =
      '<p><img src="https://x/a.png" alt="a"><img src="https://x/b.png" alt="b"><br><img src="https://x/c.png" alt="c"><br><picture><img src="https://x/d.png" alt="d"></picture></p>'
    const html = renderMarkdown(source)
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
    expect(doc.body.querySelectorAll('.md-img-row')).toHaveLength(3)
    expect(doc.body.querySelectorAll('.md-img-row-multi')).toHaveLength(1)
    expect(doc.body.querySelector('.md-img-row-multi img')).toBeTruthy()
  })

  it('空行分隔的整幅横幅上下堆叠不并排，各自居中成行', () => {
    const html = renderMarkdown(
      '<div align="center">\n\n<picture><img src="https://x/a.png" alt="header"></picture>\n\n<a href="https://x"><picture><img src="https://x/b.png" alt="typing"></picture></a>\n\n</div>',
    )
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
    const rows = Array.from(doc.body.querySelectorAll('.md-img-row'))
    expect(rows).toHaveLength(2)
    expect(doc.body.querySelectorAll('.md-img-row-multi')).toHaveLength(0)
    for (const row of rows) {
      expect(row.querySelectorAll('img')).toHaveLength(1)
    }
  })

  it('div 内相邻图形单元上下堆叠不并排（GitHub 横幅语义）', () => {
    const html = renderMarkdown(
      '<div align="center">\n\n<picture>\n<img src="https://x/a.png" alt="header">\n</picture>\n\n<a href="https://x">\n<picture>\n<img src="https://x/b.png" alt="typing">\n</picture>\n</a>\n\n</div>',
    )
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
    const rows = Array.from(doc.body.querySelectorAll('.md-img-row'))
    expect(rows).toHaveLength(2)
    expect(doc.body.querySelectorAll('.md-img-row-multi')).toHaveLength(0)
    for (const row of rows) {
      expect(row.querySelectorAll('img')).toHaveLength(1)
    }
  })

  it('预览模式去掉链接与复制按钮，保留文字与图片', () => {
    const html = renderMarkdown('[链接](https://example.com) 与 ![](https://x/a.png)', { preview: true })
    expect(html).toContain('链接')
    expect(html).toContain('<img')
    expect(html).not.toContain('example.com')
    expect(html).not.toMatch(/<a\b/)

    const code = renderMarkdown('```\nx\n```', { preview: true })
    expect(code).not.toContain('md-copy')
  })
})
