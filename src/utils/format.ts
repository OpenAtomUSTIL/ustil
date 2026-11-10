/* 时间与通用格式化
   后端时间一律 ISO 8601 UTC 字符串，展示时在本地时区格式化。 */

/** 日期 + 时间（本地时区） */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 仅日期（本地时区） */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** 相对时间（本地时区换算） */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return formatDate(iso)
}

/** 倒计时文案（仅展示；能否提交以接口 canSubmit 为准，禁止据此判断按钮可用性） */
export function formatCountdown(targetIso: string, nowMs: number = Date.now()): string {
  const diff = new Date(targetIso).getTime() - nowMs
  if (diff <= 0) return '已截止'
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分`
  return `${Math.max(minutes, 1)} 分钟`
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 角色中文名 */
export function roleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '管理员'
    case 'ALUMNI':
      return '往届生'
    case 'MEMBER':
      return '普通成员'
    default:
      return role
  }
}

/** 昵称首字缩写（无头像时的占位） */
export function initialsOf(nickname: string): string {
  const trimmed = nickname.trim()
  if (!trimmed) return '??'
  return trimmed.slice(0, 2).toUpperCase()
}
