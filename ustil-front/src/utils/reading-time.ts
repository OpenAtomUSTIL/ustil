/** 后端为唯一计算来源；兼容旧响应缺少字段，不把异常值显示给用户。 */
export function formatReadingTime(minutes: unknown): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return ''
  return `约 ${Math.ceil(minutes)} 分钟阅读`
}
