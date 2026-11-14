// 固定页面/API 路径不能作为内容地址；兼容修复前已经保存的冲突 slug。
const RESERVED_CONTENT_SLUGS = new Set(['new', 'pending'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function contentPathId(item: { id: string; slug: string }): string {
  return RESERVED_CONTENT_SLUGS.has(item.slug.toLowerCase()) || UUID_RE.test(item.slug)
    ? item.id
    : item.slug
}
