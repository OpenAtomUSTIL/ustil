/* ============================================================
   跨端契约 DTO —— 与 ustil-hub/AGENTS.md §4 逐字对齐
   禁止凭想象增减字段；字段名一律 camelCase；时间一律 ISO 8601 UTC 字符串。
   ============================================================ */

/** 角色：管理员 / 往届生 / 普通成员 */
export type Role = 'ADMIN' | 'ALUMNI' | 'MEMBER'

/** Issue 状态：未解决 / 已解答 / 搁置 */
export type IssueStatus = 'OPEN' | 'ANSWERED' | 'ON_HOLD'

/** 作业状态：未开始 / 进行中 / 已截止（由服务端时间派生） */
export type AssignmentState = 'NOT_STARTED' | 'OPEN' | 'CLOSED'

/** 当前登录用户完整资料 */
export interface UserSelf {
  id: string
  nickname: string
  avatarUrl: string
  role: Role
  /** 账号状态（契约未枚举取值，不猜测，按字符串处理） */
  status: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

/** 他人公开资料（只含昵称/头像/角色） */
export interface UserPublic {
  id: string
  nickname: string
  avatarUrl: string
  role: Role
}

/** 附件视图 */
export interface AttachmentView {
  id: string
  key: string
  originalName: string
  size: number
  mime: string
  url: string
}

/** 分页响应体 */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 文章列表项 */
export interface ArticleListItem {
  id: string
  title: string
  excerpt: string
  author: UserPublic
  createdAt: string
  updatedAt: string
}

/** 文章详情（content 为 markdown 原文） */
export interface ArticleDetail {
  id: string
  title: string
  content: string
  author: UserPublic
  createdAt: string
  updatedAt: string
}

/** 作业列表项 / 详情 */
export interface AssignmentItem {
  id: string
  title: string
  description: string
  startAt: string
  deadlineAt: string
  state: AssignmentState
  /** 能否提交以接口返回为准，前端不得用本地时间推算 */
  canSubmit: boolean
  publisher: UserPublic
  mySubmission: SubmissionView | null
  createdAt: string
  updatedAt: string
}

/** 作业提交视图 */
export interface SubmissionView {
  id: string
  assignmentId: string
  submitter: UserPublic
  note: string
  attachment: AttachmentView
  createdAt: string
  updatedAt: string
}

/** Issue 列表项 */
export interface IssueListItem {
  id: string
  title: string
  status: IssueStatus
  author: UserPublic
  replyCount: number
  answeredBy: UserPublic | null
  answeredAt: string | null
  createdAt: string
  updatedAt: string
}

/** Issue 详情：列表项字段 + 正文与回复 */
export interface IssueDetail extends IssueListItem {
  content: string
  replies: ReplyView[]
}

/** 回复视图 */
export interface ReplyView {
  id: string
  content: string
  author: UserPublic
  createdAt: string
}

/* ============ 请求体 ============ */

export interface RegisterRequest {
  identifier: string
  password: string
  nickname: string
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileRequest {
  nickname?: string
  avatarUrl?: string
}

export interface UpdateIdentifierRequest {
  type: 'email' | 'phone'
  value: string
  password: string
}

export interface ArticleWriteRequest {
  title: string
  content: string
}

export interface AssignmentWriteRequest {
  title: string
  description: string
  startAt: string
  deadlineAt: string
}

export interface CreateIssueRequest {
  title: string
  content: string
}

export interface CreateReplyRequest {
  content: string
}

export interface UpdateIssueStatusRequest {
  status: IssueStatus
}

/** 通用分页查询参数 */
export type PageQuery = {
  page?: number
  pageSize?: number
}

/** 封禁/解封响应体（status 取值契约未枚举，按字符串处理） */
export interface BanResult {
  id: string
  status: string
}

/** 统一错误体（后端 AllExceptionsFilter 产出） */
export interface ErrorBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
}
