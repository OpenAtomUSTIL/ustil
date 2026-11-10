/* 上传前端预检：只是提前提示，后端仍会按同样规则拒收 */

/** 作业提交扩展名白名单 */
export const SUBMIT_EXTENSIONS = ['doc', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'zip'] as const

/** 头像扩展名白名单 */
export const AVATAR_EXTENSIONS = ['png', 'jpg', 'jpeg'] as const

/** 单文件大小上限（字节） */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx < 0 ? '' : name.slice(idx + 1).toLowerCase()
}

/**
 * 校验文件扩展名与大小。
 * @returns 错误文案（中文）；通过则返回 null
 */
export function validateUploadFile(
  file: File,
  extensions: readonly string[],
  maxBytes: number = MAX_UPLOAD_BYTES,
): string | null {
  const ext = fileExtension(file.name)
  if (!extensions.includes(ext)) {
    return `仅支持 ${extensions.join(' / ')} 格式`
  }
  if (file.size > maxBytes) {
    return `文件大小 ${Math.round(file.size / 1024 / 1024 * 10) / 10}MB，超过 ${maxBytes / 1024 / 1024}MB 上限`
  }
  return null
}
