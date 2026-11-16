/** 登录/注册后的回跳：站内走路由，仅可信文档站允许跨站跳转。 */
export function resolveAuthRedirect(value: unknown, origin: string): { external: boolean; target: string } {
  const fallback = { external: false, target: '/' };
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const current = new URL(origin);
    const target = new URL(value, current);
    if (target.username || target.password) return fallback;
    if (target.origin === current.origin) {
      return { external: false, target: target.pathname + target.search + target.hash };
    }
    const docsOrigin = current.hostname === 'localhost'
      ? `${current.protocol}//docs.localhost${current.port ? ':' + current.port : ''}`
      : ['forum.openatomustil.cn', 'openatomustil.cn'].includes(current.hostname)
        ? 'https://docs.openatomustil.cn'
        : null;
    return docsOrigin && target.origin === docsOrigin
      ? { external: true, target: target.href }
      : fallback;
  } catch {
    return fallback;
  }
}
