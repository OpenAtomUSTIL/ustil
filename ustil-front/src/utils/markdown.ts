/* Markdown 渲染：后端存 markdown 原文，前端用 marked + KaTeX + highlight.js 渲染并经 DOMPurify 消毒防 XSS */

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLang from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import 'katex/dist/katex.min.css'

const LANGUAGES = {
  bash,
  c,
  cpp,
  css,
  go,
  java,
  javascript,
  json,
  markdown: markdownLang,
  php,
  plaintext,
  python,
  rust,
  sql,
  typescript,
  xml,
}

const PRIMARY_NAMES = new Map<object, string>()
for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language)
  const definition = hljs.getLanguage(name)
  if (definition) PRIMARY_NAMES.set(definition, name)
}

marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

marked.use(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
)

const PURIFY_CONFIG = {
  ADD_TAGS: [
    'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
    'msubsup', 'mfrac', 'msqrt', 'mroot', 'merror', 'mtext', 'ms', 'mstyle',
    'mtable', 'mtr', 'mtd', 'munder', 'mover', 'munderover', 'mpadded',
    'mphantom', 'mspace', 'maction',
  ],
  ADD_ATTR: [
    'encoding', 'displaystyle', 'mathvariant', 'stretchy', 'fence', 'separator',
    'accent', 'accentunder', 'scriptlevel', 'display', 'linethickness', 'lspace',
    'rspace', 'voffset', 'width', 'height', 'depth', 'align',
  ],
}

function unescapeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function withLineNumbers(html: string): string {
  const tokens = html.match(/<span\b[^>]*>|<\/span>|[^<]+/g) ?? []
  const lines: string[] = []
  const stack: string[] = []
  let current = ''
  for (const tok of tokens) {
    if (tok.startsWith('<span')) {
      stack.push(tok)
      current += tok
    } else if (tok === '</span>') {
      stack.pop()
      current += tok
    } else {
      const parts = tok.split('\n')
      parts.forEach((part, i) => {
        if (i > 0) {
          current += '</span>'.repeat(stack.length)
          lines.push(current)
          current = stack.join('')
        }
        current += part
      })
    }
  }
  lines.push(current)
  if (lines.length === 1 && lines[0].trim() === '') return ''
  return lines.map((line) => `<span class="md-code-line">${line}</span>`).join('\n')
}

const CODE_BLOCK_RE = /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g

function enhanceCodeBlocks(html: string): string {
  return html.replace(CODE_BLOCK_RE, (_match, attrs: string, inner: string) => {
    const classMatch = /class="([^"]*)"/.exec(attrs)
    const langMatch = classMatch ? /(?:^|\s)language-(\S+)/.exec(classMatch[1]) : null
    const rawLang = langMatch ? langMatch[1] : ''
    const definition = rawLang ? hljs.getLanguage(unescapeAttr(rawLang)) : undefined
    const canonical = definition ? PRIMARY_NAMES.get(definition) : undefined
    const codeClass = rawLang ? `hljs language-${canonical ?? rawLang}` : 'hljs'
    const dataLang = rawLang ? ` data-lang="${rawLang}"` : ''
    const lines = withLineNumbers(inner.replace(/\n$/, ''))
    return `<pre${dataLang}><button type="button" class="md-copy">复制</button><code class="${codeClass}">${lines}</code></pre>`
  })
}

/** 图行判定：IMG、仅含单图的 picture、或包住它们的链接（徽章常用 picture 承载暗色适配） */
function isImageLike(el: Element): boolean {
  if (el.nodeName === 'IMG') return true
  if (el.nodeName === 'PICTURE') {
    let imgCount = 0
    for (const child of Array.from(el.children)) {
      if (child.nodeName === 'IMG') imgCount += 1
      else if (child.nodeName !== 'SOURCE') return false
    }
    return imgCount === 1
  }
  if (el.nodeName === 'A') {
    return el.children.length === 1 && isImageLike(el.children[0])
  }
  return false
}

/** 预览模式去掉链接与复制按钮（列表卡片可嵌在 RouterLink 内），纯图段落标记为图行便于并排布局，br 分隔的图组拆分为多个图行 */
function processHtml(html: string, preview: boolean): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  if (preview) {
    for (const anchor of Array.from(doc.body.querySelectorAll('a'))) {
      const parent = anchor.parentNode
      if (!parent) continue
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor)
      parent.removeChild(anchor)
    }
    for (const button of Array.from(doc.body.querySelectorAll('button.md-copy'))) {
      button.remove()
    }
  }
  for (const el of Array.from(doc.body.querySelectorAll('p, div'))) {
    const isSeparator = (node: Node) =>
      (node.nodeType === Node.ELEMENT_NODE && (node as Element).nodeName === 'BR') ||
      (node.nodeType === Node.TEXT_NODE && /\n[^\S\n]*\n/.test(node.textContent ?? ''))
    const nodes = Array.from(el.childNodes).filter(
      (node) => node.nodeType !== Node.TEXT_NODE || !!node.textContent?.trim() || isSeparator(node),
    )
    let imageCount = 0
    let onlyImages = true
    for (const node of nodes) {
      const element = node as Element
      if (isSeparator(node)) continue
      if (node.nodeType === Node.TEXT_NODE || !isImageLike(element)) {
        onlyImages = false
        break
      }
      imageCount += 1
    }
    if (!onlyImages || imageCount === 0) continue

    // p 为行内流：图元按分隔符分行后各自行内并排；div 为块容器：图形单元各自上下堆叠（GitHub 横幅语义）
    const rows: Element[][] = []
    if (el.nodeName === 'DIV') {
      for (const node of nodes) {
        if (!isSeparator(node)) rows.push([node as Element])
      }
    } else {
      const groups: Element[][] = [[]]
      for (const node of nodes) {
        if (isSeparator(node)) {
          groups.push([])
          continue
        }
        groups[groups.length - 1].push(node as Element)
      }
      rows.push(...groups.filter((group) => group.length > 0))
    }
    const mark = (row: Element, group: Element[]) => {
      row.classList.add('md-img-row')
      if (group.length >= 2) row.classList.add('md-img-row-multi')
    }
    if (rows.length === 1) {
      mark(el, rows[0])
      continue
    }
    const parent = el.parentNode
    if (!parent) continue
    for (const group of rows) {
      const row = el.cloneNode(false) as Element
      for (const node of group) row.appendChild(node)
      mark(row, group)
      parent.insertBefore(row, el)
    }
    parent.removeChild(el)
  }
  return doc.body.innerHTML
}

export function renderMarkdown(source: string, options: { preview?: boolean } = {}): string {
  try {
    const raw = marked.parse(source, { async: false })
    return processHtml(
      DOMPurify.sanitize(enhanceCodeBlocks(raw), PURIFY_CONFIG),
      options.preview ?? false,
    )
  } catch {
    return source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
}
