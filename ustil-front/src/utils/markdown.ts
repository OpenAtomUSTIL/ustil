/* Markdown 渲染：后端存 markdown 原文，前端用 marked + KaTeX 渲染并经 DOMPurify 消毒防 XSS */

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import 'katex/dist/katex.min.css'

marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

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
    'rspace', 'voffset', 'width', 'height', 'depth',
  ],
}

export function renderMarkdown(source: string): string {
  try {
    const raw = marked.parse(source, { async: false })
    return DOMPurify.sanitize(raw, PURIFY_CONFIG)
  } catch {
    return source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
}
