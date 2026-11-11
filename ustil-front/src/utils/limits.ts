/* 表单长度契约（与后端统一）
   全站表单的 maxlength / minlength 与提交前 JS 校验共用这些常量。 */

export const NICKNAME_MAX = 50
export const TITLE_MAX = 200
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
export const NOTE_MAX = 1000
export const KEYWORD_MAX = 100
export const INVITE_CODE_MAX = 64
export const TAG_MAX = 30
export const TAGS_MAX = 10
export const RESOURCE_URL_MAX = 2048

/** 昵称长度校验（按 trim 后计），通过返回 null */
export function checkNickname(value: string): string | null {
  const len = value.trim().length
  if (len < 1 || len > NICKNAME_MAX) return `昵称长度需为 1-${NICKNAME_MAX} 个字符`
  return null
}

/** 标题长度校验（按 trim 后计），通过返回 null */
export function checkTitle(value: string): string | null {
  const len = value.trim().length
  if (len < 1 || len > TITLE_MAX) return `标题长度需为 1-${TITLE_MAX} 个字符`
  return null
}

/** 密码长度校验，通过返回 null */
export function checkPassword(value: string): string | null {
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    return `密码长度需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 个字符`
  }
  return null
}

/** 单个标签长度校验（按 trim 后计），通过返回 null */
export function checkTag(value: string): string | null {
  const len = value.trim().length
  if (len < 1 || len > TAG_MAX) return `标签长度需为 1-${TAG_MAX} 个字符`
  return null
}

/** 标签集合校验（数量上限 + 逐个长度），通过返回 null */
export function checkTags(values: string[]): string | null {
  if (values.length > TAGS_MAX) return `标签最多 ${TAGS_MAX} 个`
  for (const value of values) {
    const problem = checkTag(value)
    if (problem) return problem
  }
  return null
}

/** 资源链接校验（必须 http(s) 且长度受限），通过返回 null */
export function checkResourceUrl(value: string): string | null {
  const url = value.trim()
  if (!url) return '请填写资源链接'
  if (url.length > RESOURCE_URL_MAX) return `链接长度不能超过 ${RESOURCE_URL_MAX} 个字符`
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '链接需以 http:// 或 https:// 开头'
  } catch {
    return '链接格式不正确'
  }
  return null
}
