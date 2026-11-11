/* ============================================================
   全站唯一请求出口
   - 组件 / store 禁止直接 fetch / axios / XMLHttpRequest，一律调用本文件
   - baseURL = import.meta.env.VITE_API_BASE_URL + '/api/v1'
   - 鉴权走 httpOnly cookie（credentials: 'include'），禁读写 token
   - 非 2xx 解析统一错误体并抛出 ApiError；401 统一续期，失效后重新登录
   - pageSize > 100 本地拦截（与后端约定一致）
   - 错误类与错误判定见 ./error
   ============================================================ */

import type {
  AdminStats,
  AdminUser,
  AnnouncementCreateRequest,
  AnnouncementItem,
  AnnouncementUpdateRequest,
  ApiRegistryItem,
  ArticleDetail,
  ArticleListItem,
  ArticleWriteRequest,
  AssignmentItem,
  AssignmentWriteRequest,
  AuditLogItem,
  BanResult,
  CommentItem,
  CreateIssueRequest,
  CreateReplyRequest,
  FileItem,
  FileKind,
  GenerateInviteCodesRequest,
  InviteCode,
  IssueDetail,
  IssueListItem,
  IssueStatus,
  LoginLogItem,
  LoginRequest,
  MySubmissionItem,
  NotificationItem,
  OnlineUsersResult,
  Page,
  PageQuery,
  PasswordChangeRequest,
  RegisterRequest,
  RequestLogItem,
  ResourceItem,
  ResourceWriteRequest,
  SubmissionView,
  TagItem,
  TrashItem,
  TrashType,
  UpdateIdentifierRequest,
  UpdateIssueStatusRequest,
  UpdateProfileRequest,
  UpdateUserRoleRequest,
  UserPublic,
  UserSelf,
} from './types'
import { ApiError, isUnauthorized, localError, triggerUnauthorized, triggerSessionRestored, type ErrorBody } from './error'

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/v1`
const PAGE_SIZE_MAX = 100

/* ============ 基础请求 ============ */

export type QueryValue = string | number | boolean | undefined | null
export type QueryParams = Record<string, QueryValue>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  query?: QueryParams
  body?: unknown
  /** 登录/注册/探测登录态等场景收到 401 不触发跳登录 */
  skipAuthHandler?: boolean
  /** 登录、注册、登出不自动续期，避免旧会话干扰身份切换。 */
  retryAuth?: boolean
}

function buildUrl(path: string, query?: QueryParams): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, String(value))
  }
  const suffix = qs.toString()
  return `${API_BASE}${path}${suffix ? `?${suffix}` : ''}`
}

function assertPageSize(query: QueryParams | undefined, path: string): void {
  const raw = query?.pageSize
  if (raw === undefined || raw === null) return
  const pageSize = Number(raw)
  if (Number.isFinite(pageSize) && pageSize > PAGE_SIZE_MAX) {
    throw localError(400, `pageSize 不能超过 ${PAGE_SIZE_MAX}`, path)
  }
}

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  if (!res.ok) {
    let body: ErrorBody | null = null
    try {
      body = (await res.json()) as ErrorBody
    } catch {
      /* 非 JSON 错误体时使用 HTTP 状态兜底 */
    }
    throw body ? new ApiError(body) : localError(res.status, `请求失败（HTTP ${res.status}）`, path)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  try {
    return (text ? JSON.parse(text) : undefined) as T
  } catch {
    throw localError(502, '服务器返回了无效的数据', path)
  }
}

let refreshPromise: Promise<UserSelf> | null = null
let sessionGeneration = 0

async function refreshSession(): Promise<UserSelf> {
  if (!refreshPromise) {
    const recover = async (): Promise<UserSelf> => {
      // 同源多个标签页共用 cookie。拿到锁后先探测，避免再次消费已轮换的 refresh。
      const current = await fetch(buildUrl('/auth/me'), { credentials: 'include' })
      let user: UserSelf
      if (current.status === 401) {
        const refreshed = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST', credentials: 'include',
        })
        user = await handleResponse<UserSelf>(refreshed, '/auth/refresh')
      } else {
        user = await handleResponse<UserSelf>(current, '/auth/me')
      }
      sessionGeneration += 1
      triggerSessionRestored(user)
      return user
    }
    const pending: Promise<UserSelf> = (async () => {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return await navigator.locks.request('ustil-auth-refresh', recover)
      }
      return recover()
    })()
    refreshPromise = pending.finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

async function withSessionResponse(
  path: string,
  send: () => Promise<Response>,
  skipAuthHandler: boolean,
  retryAuth = true,
): Promise<Response> {
  const generation = sessionGeneration
  let res = await send()
  if (res.status === 401 && retryAuth) {
    try {
      // 如果另一个请求已经刷新完成，只重发当前请求，不重复轮换 token。
      if (generation === sessionGeneration) await refreshSession()
    } catch (error) {
      if (isUnauthorized(error) && !skipAuthHandler) triggerUnauthorized()
      throw error
    }
    res = await send()
  }
  if (res.status === 401 && !skipAuthHandler) triggerUnauthorized()
  if (!res.ok) await handleResponse<never>(res, path)
  return res
}

async function withSession<T>(
  path: string,
  send: () => Promise<Response>,
  skipAuthHandler: boolean,
  retryAuth = true,
): Promise<T> {
  return handleResponse<T>(await withSessionResponse(path, send, skipAuthHandler, retryAuth), path)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, skipAuthHandler = false, retryAuth = true } = options
  assertPageSize(query, path)
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return withSession<T>(path, () => fetch(buildUrl(path, query), {
    method, credentials: 'include', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }), skipAuthHandler, retryAuth)
}

/** multipart 与普通请求共用续期和错误解析，401 时最多重发一次。 */
function upload<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
  skipAuthHandler = false,
): Promise<T> {
  const send = (): Promise<Response> => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildUrl(path))
    xhr.withCredentials = true
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 0) {
        reject(localError(0, '网络异常，上传失败', path))
        return
      }
      resolve(new Response(xhr.status === 204 ? null : xhr.responseText, {
        status: xhr.status,
        headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') ?? 'application/json' },
      }))
    }
    xhr.onerror = () => reject(localError(0, '网络异常，上传失败', path))
    xhr.onabort = () => reject(localError(0, '上传已取消', path))
    xhr.send(form)
  })
  return withSession<T>(path, send, skipAuthHandler)
}

/* ============ 接口封装（与后端契约逐字对齐） ============ */

export const authApi = {
  /** 注册并种下 httpOnly cookie */
  register: (payload: RegisterRequest) =>
    request<UserSelf>('/auth/register', { method: 'POST', body: payload, skipAuthHandler: true, retryAuth: false }),
  login: (payload: LoginRequest) =>
    request<UserSelf>('/auth/login', { method: 'POST', body: payload, skipAuthHandler: true, retryAuth: false }),
  refresh: () => refreshSession(),
  logout: () => request<void>('/auth/logout', { method: 'POST', skipAuthHandler: true, retryAuth: false }),
  changePassword: (payload: PasswordChangeRequest) =>
    request<void>('/auth/password', { method: 'POST', body: payload }),
  /** 恢复登录态的唯一来源；未登录返回 401，不触发跳转 */
  me: () => request<UserSelf>('/auth/me', { skipAuthHandler: true }),
  /** 持码转正：VISITOR 提交邀请码升级为 MEMBER，换发双 token */
  redeemInviteCode: (payload: { inviteCode: string }) =>
    request<UserSelf>('/auth/invite-code', { method: 'POST', body: payload }),
}

export const usersApi = {
  getUser: (id: string) => request<UserPublic>(`/users/${id}`),
  updateMe: (payload: UpdateProfileRequest) =>
    request<UserSelf>('/users/me', { method: 'PATCH', body: payload }),
  updateIdentifier: (payload: UpdateIdentifierRequest) =>
    request<UserSelf>('/users/me/identifier', { method: 'PUT', body: payload }),
  /** 上传头像：png / jpg / jpeg，≤10MB（前端预检见 utils/upload.ts，后端仍会拒） */
  uploadAvatar: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return upload<UserSelf>('/users/me/avatar', form, onProgress)
  },
  ban: (id: string) => request<BanResult>(`/users/${id}/ban`, { method: 'POST' }),
  unban: (id: string) => request<BanResult>(`/users/${id}/unban`, { method: 'POST' }),
}

export const articlesApi = {
  /** authorId 可选：按作者过滤（「我的文章」）；tag 可选：按标签过滤 */
  list: (query: PageQuery & { keyword?: string; authorId?: string; tag?: string }) =>
    request<Page<ArticleListItem>>('/articles', { query }),
  get: (id: string) => request<ArticleDetail>(`/articles/${id}`),
  create: (payload: ArticleWriteRequest) =>
    request<void>('/articles', { method: 'POST', body: payload }),
  update: (id: string, payload: ArticleWriteRequest) =>
    request<void>(`/articles/${id}`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<void>(`/articles/${id}`, { method: 'DELETE' }),
}

export const assignmentsApi = {
  downloadAttachment: async (id: string): Promise<Blob> => {
    const path = `/assignments/files/${encodeURIComponent(id)}`
    const res = await withSessionResponse(path, () => fetch(buildUrl(path), {
      credentials: 'include',
    }), false)
    return res.blob()
  },
  list: (query: PageQuery) => request<Page<AssignmentItem>>('/assignments', { query }),
  get: (id: string) => request<AssignmentItem>(`/assignments/${id}`),
  create: (payload: AssignmentWriteRequest) =>
    request<void>('/assignments', { method: 'POST', body: payload }),
  update: (id: string, payload: AssignmentWriteRequest) =>
    request<void>(`/assignments/${id}`, { method: 'PATCH', body: payload }),
  /** 提交作业：file 必填、note 选填；是否可提交以接口 canSubmit 为准 */
  submit: (
    id: string,
    file: File,
    note: string | undefined,
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData()
    form.append('file', file)
    if (note) form.append('note', note)
    return upload<SubmissionView>(`/assignments/${id}/submissions`, form, onProgress)
  },
  submissions: (id: string, query: PageQuery) =>
    request<Page<SubmissionView>>(`/assignments/${id}/submissions`, { query }),
  /** 我的作业提交（updatedAt 倒序），VISITOR 403 */
  mySubmissions: (query: PageQuery) =>
    request<Page<MySubmissionItem>>('/assignments/submissions/mine', { query }),
}

export const issuesApi = {
  /** tag 可选：按标签过滤 */
  list: (query: PageQuery & { status?: IssueStatus; keyword?: string; tag?: string }) =>
    request<Page<IssueListItem>>('/issues', { query }),
  get: (id: string) => request<IssueDetail>(`/issues/${id}`),
  create: (payload: CreateIssueRequest) => request<void>('/issues', { method: 'POST', body: payload }),
  reply: (id: string, payload: CreateReplyRequest) =>
    request<void>(`/issues/${id}/replies`, { method: 'POST', body: payload }),
  updateStatus: (id: string, payload: UpdateIssueStatusRequest) =>
    request<void>(`/issues/${id}/status`, { method: 'PATCH', body: payload }),
}

export const adminApi = {
  stats: () => request<AdminStats>('/admin/stats'),
  generateInviteCodes: (payload: GenerateInviteCodesRequest) =>
    request<{ items: InviteCode[] }>('/admin/invite-codes', { method: 'POST', body: payload }),
  listInviteCodes: (query: PageQuery & { status?: string }) =>
    request<Page<InviteCode>>('/admin/invite-codes', { query }),
  revokeInviteCode: (id: string) =>
    request<void>(`/admin/invite-codes/${id}/revoke`, { method: 'POST' }),
  listUsers: (query: PageQuery & { keyword?: string; role?: string; status?: string }) =>
    request<Page<AdminUser>>('/admin/users', { query }),
  updateUserRole: (id: string, payload: UpdateUserRoleRequest) =>
    request<AdminUser>(`/admin/users/${id}/role`, { method: 'PATCH', body: payload }),
  promoteUser: (id: string) => request<AdminUser>(`/admin/users/${id}/promote`, { method: 'POST' }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  /** 接口请求日志（createdAt desc） */
  listRequestLogs: (query: PageQuery & { userId?: string; method?: string }) =>
    request<Page<RequestLogItem>>('/admin/request-logs', { query }),
  /** 操作审计日志（createdAt desc） */
  listAuditLogs: (query: PageQuery & { action?: string; targetType?: string; actorId?: string }) =>
    request<Page<AuditLogItem>>('/admin/audit-logs', { query }),
  /** 登录日志（success 可选 true/false 过滤） */
  listLoginLogs: (query: PageQuery & { email?: string; success?: boolean }) =>
    request<Page<LoginLogItem>>('/admin/login-logs', { query }),
  /** 在线用户（minutes 1-1440，最近活跃窗口） */
  getOnlineUsers: (minutes: number) =>
    request<OnlineUsersResult>('/admin/online-users', { query: { minutes } }),
  /** 文件列表（kind 过滤 ATTACHMENT/AVATAR + keyword） */
  listFiles: (query: PageQuery & { kind?: FileKind; keyword?: string }) =>
    request<Page<FileItem>>('/admin/files', { query }),
  /** 删除孤儿文件（referenced=true 时后端 409「文件使用中，不可删除」） */
  deleteFile: (id: string) => request<void>(`/admin/files/${id}`, { method: 'DELETE' }),
  /** 评论列表（含已软删除） */
  listComments: (query: PageQuery & { keyword?: string }) =>
    request<Page<CommentItem>>('/admin/comments', { query }),
  /** 软删除评论（移入回收站） */
  deleteComment: (id: string) => request<void>(`/admin/comments/${id}`, { method: 'DELETE' }),
  /** 回收站（type 过滤，deletedAt desc） */
  listTrash: (query: PageQuery & { type?: TrashType }) =>
    request<Page<TrashItem>>('/admin/trash', { query }),
  /** 从回收站恢复 */
  restoreTrash: (type: TrashType, id: string) =>
    request<void>(`/admin/trash/${type}/${id}/restore`, { method: 'POST' }),
  /** 全站接口 + 权限总览 */
  apiRegistry: () => request<ApiRegistryItem[]>('/admin/api-registry'),
}

/** 文件内容预览地址（同源 <img> 直接加载，带 cookie，不经 JS 读写）
    走管理端统一出口 /admin/files/:id/content（WHEEL/ADMIN，附件与头像皆可读） */
export function fileContentUrl(id: string): string {
  return `${API_BASE}/admin/files/${encodeURIComponent(id)}/content`
}

export const announcementsApi = {
  list: (query: PageQuery & { keyword?: string }) =>
    request<Page<AnnouncementItem>>('/announcements', { query }),
  get: (id: string) => request<AnnouncementItem>(`/announcements/${id}`),
  create: (payload: AnnouncementCreateRequest) =>
    request<void>('/announcements', { method: 'POST', body: payload }),
  update: (id: string, payload: AnnouncementUpdateRequest) =>
    request<void>(`/announcements/${id}`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<void>(`/announcements/${id}`, { method: 'DELETE' }),
}

export const notificationsApi = {
  list: (query: PageQuery & { unreadOnly?: boolean }) =>
    request<Page<NotificationItem>>('/notifications', { query }),
  unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => request<void>('/notifications/read-all', { method: 'POST' }),
}

export const resourcesApi = {
  list: (query: PageQuery & { category?: string; keyword?: string; tag?: string }) =>
    request<Page<ResourceItem>>('/resources', { query }),
  get: (id: string) => request<ResourceItem>(`/resources/${id}`),
  create: (payload: ResourceWriteRequest) =>
    request<void>('/resources', { method: 'POST', body: payload }),
  update: (id: string, payload: ResourceWriteRequest) =>
    request<void>(`/resources/${id}`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<void>(`/resources/${id}`, { method: 'DELETE' }),
}

export const tagsApi = {
  list: () => request<TagItem[]>('/tags'),
}

/* 文件下载/预览直接使用 AttachmentView.url（GET /assignments/files/:attachmentId，同源带 cookie），不经 JS 读写 */
