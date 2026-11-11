import type { UserSelf } from './types'

/* ============================================================
   统一错误类与错误判定（错误相关唯一出口）
   - ErrorBody：与后端 AllExceptionsFilter 约定的错误体结构
   - ApiError：非 2xx 响应体的统一包装（含本地构造的兜底错误）
   - 401 统一处理：由 main.ts 注册跳转登录逻辑
   ============================================================ */

/** 与后端约定的错误体（message 可能是 string[]） */
export interface ErrorBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
}

/** 统一 API 错误（message 可能是 string[]，已归一为文案） */
export class ApiError extends Error {
  readonly statusCode: number
  readonly errorName: string
  readonly path: string
  readonly timestamp: string
  readonly details: string[]

  constructor(body: ErrorBody) {
    const details = Array.isArray(body.message) ? body.message : [body.message]
    super(details.join('；'))
    this.name = 'ApiError'
    this.statusCode = body.statusCode
    this.errorName = body.error
    this.path = body.path
    this.timestamp = body.timestamp
    this.details = details
  }
}

export function localError(statusCode: number, message: string, path: string): ApiError {
  return new ApiError({
    statusCode,
    error: statusCode === 0 ? 'Network Error' : 'Bad Request',
    message,
    path,
    timestamp: new Date().toISOString(),
  })
}

/** 从任意异常提取用户可读文案 */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return '网络异常，请稍后重试'
}

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 403
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 401
}

/* —— 401 统一处理：由 main.ts 注册跳转登录逻辑 —— */
type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}

export function triggerUnauthorized(): void {
  onUnauthorized?.()
}

// 请求层只发送事件，避免引入 auth store 导致循环依赖。
let onSessionRestored: ((user: UserSelf) => void) | null = null

export function setSessionRestoredHandler(handler: (user: UserSelf) => void): void {
  onSessionRestored = handler
}

export function triggerSessionRestored(user: UserSelf): void {
  onSessionRestored?.(user)
}
