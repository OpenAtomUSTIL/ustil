/* Markdown 渲染：后端存 markdown 原文，前端用 marked 渲染并经 DOMPurify 消毒防 XSS */

import DOMPurify from 'dompurify'
import { marked } from 'marked'

export function renderMarkdown(source: string): string {
  const raw = marked.parse(source, { async: false })
  return DOMPurify.sanitize(raw)
}
