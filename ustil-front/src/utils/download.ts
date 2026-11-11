import { assignmentsApi } from '@/api/request'

/** 附件下载：走 request.ts 下载通道（续期/错误统一），Blob → a[download] */
export async function downloadAttachmentFile(id: string, fileName: string): Promise<void> {
  const blob = await assignmentsApi.downloadAttachment(id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
