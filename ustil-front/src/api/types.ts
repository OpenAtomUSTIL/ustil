/* ============================================================
   跨端契约 DTO —— 与 ustil-hub/AGENTS.md §4 逐字对齐
   禁止凭想象增减字段；字段名一律 camelCase；时间一律 ISO 8601 UTC 字符串。
   ============================================================ */

/** 角色：临时访客 / 学习成员 / 校友 / 负责人 / 管理员 */
export type Role = 'VISITOR' | 'MEMBER' | 'ALUMNI' | 'WHEEL' | 'ADMIN'

/** Issue 状态：未解决 / 已解答 / 搁置 */
export type IssueStatus = 'OPEN' | 'ANSWERED' | 'ON_HOLD'

/** 文章审核状态：待审 / 已发布 / 已拒绝 / 已隐藏 */
export type ArticleStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN'

/** 作业状态：未开始 / 进行中 / 已截止（由服务端时间派生） */
export type AssignmentState = 'NOT_STARTED' | 'OPEN' | 'CLOSED'

/** 当前登录用户完整资料 */
export interface UserSelf {
  id: string
  username: string
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

/** 他人公开资料（只含 handle/昵称/头像/角色） */
export interface UserPublic {
  id: string
  username: string
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
  slug: string
  title: string
  /** 后端根据完整正文估算的阅读分钟数。 */
  readingMinutes: number
  excerpt: string
  author: UserPublic
  tags: string[]
  status: ArticleStatus
  createdAt: string
  updatedAt: string
}

/** 文章详情（content 为 markdown 原文） */
export interface ArticleDetail {
  id: string
  slug: string
  title: string
  /** 后端根据完整正文估算的阅读分钟数。 */
  readingMinutes: number
  content: string
  author: UserPublic
  tags: string[]
  status: ArticleStatus
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

/** 作业列表项 / 详情 */
export interface AssignmentItem {
  id: string
  slug: string
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
  note: string | null
  attachment: AttachmentView
  createdAt: string
  updatedAt: string
}

/** 我的作业提交列表项（GET /assignments/submissions/mine，updatedAt 倒序） */
export interface MySubmissionItem {
  id: string
  assignmentId: string
  assignmentSlug: string
  assignmentTitle: string
  startAt: string
  deadlineAt: string
  /** 作业窗口状态（与 AssignmentItem.state 同源，由服务端时间派生） */
  state: AssignmentState
  note: string | null
  attachment: { id: string; fileName: string } | null
  createdAt: string
  updatedAt: string
}

/** Issue 列表项 */
export interface IssueListItem {
  id: string
  slug: string
  title: string
  status: IssueStatus
  author: UserPublic
  replyCount: number
  answeredBy: UserPublic | null
  answeredAt: string | null
  tags: string[]
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
  /** 可选邀请码：有效则注册为 MEMBER，无码注册为 VISITOR */
  inviteCode?: string
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
  tags?: string[]
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
  tags?: string[]
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

/* ============ 管理后台 ============ */

/** 邀请码（status 取值：ACTIVE / REVOKED） */
export interface InviteCode {
  id: string
  code: string
  status: string
  maxUses: number
  usedCount: number
  remaining: number
  expiresAt: string | null
  createdAt: string
}

/** 管理后台用户视图（联系方式脱敏） */
export interface AdminUser {
  id: string
  nickname: string
  contact: string | null
  role: Role
  status: string
  createdAt: string
}

/** 概览统计 */
export interface AdminStats {
  users: Record<Role, number>
  activeInviteCodes: number
  visitorPendingCleanup: number
}

export interface GenerateInviteCodesRequest {
  count: number
  maxUses?: number
  expiresAt?: string
}

export interface UpdateUserRoleRequest {
  role: 'VISITOR' | 'MEMBER' | 'ALUMNI' | 'WHEEL'
}

/* ============ 管理日志 ============ */

/** 接口请求日志（GET /admin/request-logs，createdAt desc） */
export interface RequestLogItem {
  id: string
  method: string
  path: string
  statusCode: number
  userId: string | null
  userEmail: string | null
  ip: string
  durationMs: number
  createdAt: string
}

/** 操作审计日志（GET /admin/audit-logs，createdAt desc） */
export interface AuditLogItem {
  id: string
  actorId: string
  actorEmail: string | null
  action: string
  targetType: string
  targetId: string | null
  detail: Record<string, unknown> | null
  createdAt: string
}

/* ============ 公告 ============ */

export interface AnnouncementItem {
  id: string
  slug: string
  title: string
  content: string
  pinned: boolean
  authorId: string
  authorName: string
  authorUsername: string
  createdAt: string
  updatedAt: string
}

export interface AnnouncementCreateRequest {
  title: string
  content: string
  pinned?: boolean
  /** 通知全体成员 */
  notify?: boolean
}

export interface AnnouncementUpdateRequest {
  title?: string
  content?: string
  pinned?: boolean
}

/* ============ 通知 ============ */

export type NotificationType =
  | 'ANNOUNCEMENT'
  | 'ASSIGNMENT'
  | 'ISSUE_REPLY'
  | 'ROLE'
  | 'SYSTEM'
  | 'FOLLOW'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

/* ============ 资源库 ============ */

export type ResourceCategory = 'GITHUB' | 'EXAM' | 'EBOOK' | 'DOCUMENT' | 'OTHER'

export interface ResourceItem {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  category: ResourceCategory
  tags: string[]
  creatorId: string
  creatorName: string
  creatorUsername: string
  createdAt: string
  updatedAt: string
}

export interface ResourceWriteRequest {
  title: string
  description?: string
  url: string
  category: ResourceCategory
  tags?: string[]
}

/* ============ 标签 ============ */

export interface TagItem {
  id: string
  name: string
  count: number
}

/* ============ 管理后台 · 登录日志 / 在线用户 ============ */

/** 登录日志（GET /admin/login-logs，可按 email、success 过滤） */
export interface LoginLogItem {
  id: string
  /** 未命中账号的失败登录可能没有用户 ID */
  userId: string | null
  /** 仅邮箱标识的登录有值；手机号标识登录为 null */
  email: string | null
  ip: string
  userAgent: string
  success: boolean
  /** 失败原因，成功登录为 null */
  failReason: string | null
  createdAt: string
}

/** 在线用户（GET /admin/online-users） */
export interface OnlineUserItem {
  userId: string
  email: string | null
  nickname: string
  role: Role
  lastSeenAt: string
}

export interface OnlineUsersResult {
  minutes: number
  total: number
  items: OnlineUserItem[]
}

/* ============ 管理后台 · 文件 / 评论 / 回收站 / 接口总览 ============ */

export type FileKind = 'ATTACHMENT' | 'AVATAR'

/** 文件（GET /admin/files） */
export interface FileItem {
  id: string
  fileName: string
  sizeBytes: number
  kind: FileKind
  uploaderId: string
  uploaderEmail: string | null
  isImage: boolean
  /** 是否被内容引用；仅孤立文件可删（referenced=false） */
  referenced: boolean
  createdAt: string
}

/** 评论（GET /admin/comments，含已软删除） */
export interface CommentItem {
  id: string
  issueId: string
  issueTitle: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  /** 软删除时间，未删除为 null */
  deletedAt: string | null
}

export type TrashType = 'ARTICLE' | 'ANNOUNCEMENT' | 'RESOURCE' | 'COMMENT'

/** 回收站项（GET /admin/trash；restore 按 type + id 恢复） */
export interface TrashItem {
  id: string
  type: TrashType
  title: string
  summary: string | null
  deletedAt: string
  /** 被软删除记录的原始快照（结构随类型不同，不展开） */
  original: Record<string, unknown>
}

/** 接口权限总览（GET /admin/api-registry） */
export interface ApiRegistryItem {
  method: string
  path: string
  isPublic: boolean
  /** 有值表示限定角色；空数组表示登录即可 */
  roles: Role[]
  controller: string
  handler: string
}

/** 个人主页 · 置顶内容项（跨文章/讨论/资源，顺序即展示顺序） */
export interface PinnedItem {
  type: 'ARTICLE' | 'ISSUE' | 'RESOURCE'
  id: string
  slug: string
  title: string
  /** RESOURCE 目标的外链；文章/讨论无此字段 */
  url?: string
}

/** 个人主页视图 */
export interface UserProfile {
  id: string
  username: string
  nickname: string
  avatarUrl: string | null
  role: Role
  bio: string | null
  profileReadme: string | null
  createdAt: string
  stats: {
    articles: number
    issues: number
    replies: number
    submissions: number
  }
  topTags: { name: string; count: number }[]
  pinnedItems: PinnedItem[]
  isSelf: boolean
  isFollowing: boolean
  followerCount: number
  followingCount: number
  email?: string
  phone?: string
}

/** 关注/粉丝列表用户卡 */
export interface FollowUserItem {
  id: string
  username: string
  nickname: string
  avatarUrl: string | null
  role: Role
  bio: string | null
  isSelf: boolean
  isFollowing: boolean
}

/** 活跃热力图数据 */
export interface ActivityDay {
  date: string
  count: number
}

export interface ActivityView {
  days: ActivityDay[]
}

/** 个人主页 · 回复 Tab 列表项 */
export interface ProfileReplyItem {
  id: string
  issueId: string
  issueSlug: string
  issueTitle: string
  content: string
  createdAt: string
}
