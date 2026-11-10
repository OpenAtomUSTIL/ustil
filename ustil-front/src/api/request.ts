/* ============================================================
   全站唯一请求出口
   - 组件 / store 禁止直接 fetch / axios / XMLHttpRequest，一律调用本文件
   - baseURL = import.meta.env.VITE_API_BASE_URL + '/api/v1'
   - 鉴权走 httpOnly cookie（credentials: 'include'），禁读写 token
   - 非 2xx 解析统一错误体并抛出 ApiError；401 统一触发重新登录
   - pageSize > 100 本地拦截（与后端约定一致）
   - 错误类与错误判定见 ./error
   ============================================================ */

import type {
  ArticleDetail,
  ArticleListItem,
  ArticleWriteRequest,
  AssignmentItem,
  AssignmentWriteRequest,
  BanResult,
  CreateIssueRequest,
  CreateReplyRequest,
  IssueDetail,
  IssueListItem,
  IssueStatus,
  LoginRequest,
  Page,
  PageQuery,
  PasswordChangeRequest,
  RegisterRequest,
  SubmissionView,
  UpdateIdentifierRequest,
  UpdateIssueStatusRequest,
  UpdateProfileRequest,
  UserPublic,
  UserSelf,
} from './types'
import { ApiError, localError, triggerUnauthorized, type ErrorBody } from './error'

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`
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

async function handleResponse<T>(res: Response, path: string, skipAuthHandler: boolean): Promise<T> {
  if (res.status === 401 && !skipAuthHandler) {
    triggerUnauthorized()
  }
  if (!res.ok) {
    let body: ErrorBody | null = null
    try {
      body = (await res.json()) as ErrorBody
    } catch {
      /* 非 JSON 错误体时走下面的兜底文案 */
    }
    throw body ? new ApiError(body) : localError(res.status, `请求失败（HTTP ${res.status}）`, path)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? (JSON.parse(text) as T) : undefined) as T
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, skipAuthHandler = false } = options
  assertPageSize(query, path)

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return handleResponse<T>(res, path, skipAuthHandler)
}

/** multipart 上传（带进度回调），供作业提交与头像上传使用 */
function upload<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
  skipAuthHandler = false,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildUrl(path))
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 401 && !skipAuthHandler) {
        triggerUnauthorized()
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const text = xhr.responseText
        resolve((text ? (JSON.parse(text) as T) : undefined) as T)
        return
      }
      try {
        reject(new ApiError(JSON.parse(xhr.responseText) as ErrorBody))
      } catch {
        reject(localError(xhr.status, `上传失败（HTTP ${xhr.status}）`, path))
      }
    }
    xhr.onerror = () => {
      reject(localError(0, '网络异常，上传失败', path))
    }
    xhr.send(form)
  })
}

/* ============ 接口封装（与后端契约逐字对齐） ============ */

export const authApi = {
  /** 注册并种下 httpOnly cookie */
  register: (payload: RegisterRequest) =>
    request<UserSelf>('/auth/register', { method: 'POST', body: payload, skipAuthHandler: true }),
  login: (payload: LoginRequest) =>
    request<UserSelf>('/auth/login', { method: 'POST', body: payload, skipAuthHandler: true }),
  refresh: () => request<UserSelf>('/auth/refresh', { method: 'POST' }),
  logout: () => request<void>('/auth/logout', { method: 'POST', skipAuthHandler: true }),
  changePassword: (payload: PasswordChangeRequest) =>
    request<void>('/auth/password', { method: 'POST', body: payload }),
  /** 恢复登录态的唯一来源；未登录返回 401，不触发跳转 */
  me: () => request<UserSelf>('/auth/me', { skipAuthHandler: true }),
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
  list: (query: PageQuery & { keyword?: string }) =>
    request<Page<ArticleListItem>>('/articles', { query }),
  get: (id: string) => request<ArticleDetail>(`/articles/${id}`),
  create: (payload: ArticleWriteRequest) =>
    request<void>('/articles', { method: 'POST', body: payload }),
  update: (id: string, payload: ArticleWriteRequest) =>
    request<void>(`/articles/${id}`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<void>(`/articles/${id}`, { method: 'DELETE' }),
}

export const assignmentsApi = {
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
}

export const issuesApi = {
  list: (query: PageQuery & { status?: IssueStatus; keyword?: string }) =>
    request<Page<IssueListItem>>('/issues', { query }),
  get: (id: string) => request<IssueDetail>(`/issues/${id}`),
  create: (payload: CreateIssueRequest) => request<void>('/issues', { method: 'POST', body: payload }),
  reply: (id: string, payload: CreateReplyRequest) =>
    request<void>(`/issues/${id}/replies`, { method: 'POST', body: payload }),
  updateStatus: (id: string, payload: UpdateIssueStatusRequest) =>
    request<void>(`/issues/${id}/status`, { method: 'PATCH', body: payload }),
}

/* 文件下载/预览直接使用 AttachmentView.url（GET /storage/files/:key，同源带 cookie），不经 JS 读写 */
