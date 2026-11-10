/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 根地址（不含 /api/v1） */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
