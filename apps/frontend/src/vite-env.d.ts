/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SkyTrace API, including protocol. Defaults to localhost in dev. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
