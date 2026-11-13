/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, p. ej. http://localhost:8080/api (pública, no es un secreto). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
