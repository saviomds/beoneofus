/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cross-link target for the public BeOneOfUs platform (apps/web). */
  readonly VITE_WEB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
