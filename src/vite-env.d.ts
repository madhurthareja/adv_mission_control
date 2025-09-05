/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_FRONT_CAMERA_URL: string
  readonly VITE_BACK_CAMERA_URL: string
  readonly VITE_LEFT_CAMERA_URL: string
  readonly VITE_RIGHT_CAMERA_URL: string
  readonly VITE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
