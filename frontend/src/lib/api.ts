export interface PublicAuthConfig {
  googleClientId: string
  customIdpUrl: string
  customIdpClientId: string
  customIdpRedirectUri: string
}

interface SuccessEnvelope<T> {
  status: 'success'
  message: string
  data: T
}

interface ErrorEnvelope {
  status: 'error'
  code?: string
  message: string
}

export class ApiError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export function pollShareUrl(pollId: string): string {
  const base = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
  return `${base}/p/${pollId}`
}

export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
  const base = typeof raw === 'string' ? raw : 'http://localhost:5000/api'
  const trimmed = base.replace(/\/$/, '')

  try {
    const url = new URL(trimmed)
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/api'
      return url.toString().replace(/\/$/, '')
    }
  } catch {
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
  }

  return trimmed
}

/** Socket.IO server origin (no `/api` path) */
export function getSocketBaseUrl(): string {
  const base = getApiBase()
  if (base.endsWith('/api')) {
    return base.slice(0, -4) || 'http://localhost:5000'
  }
  try {
    const u = new URL(base)
    return `${u.protocol}//${u.host}`
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'
  }
}

export function getStaticAuthConfig(): PublicAuthConfig {
  return {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    customIdpUrl: import.meta.env.VITE_CUSTOM_IDP_URL || '',
    customIdpClientId: import.meta.env.VITE_CUSTOM_IDP_CLIENT_ID || '',
    customIdpRedirectUri: import.meta.env.VITE_CUSTOM_IDP_REDIRECT_URI || ''
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getApiBase()
  const normalizedPath = path.startsWith('/api/') && base.endsWith('/api') ? path.slice(4) : path
  const url = `${base}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`
  const headers = new Headers(init.headers)
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof URLSearchParams) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...init, credentials: 'include', headers })
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as SuccessEnvelope<T> | ErrorEnvelope
  if (!res.ok || json.status !== 'success') {
    const msg = json.status === 'error' ? json.message : 'Request failed'
    const code = json.status === 'error' ? json.code : undefined
    throw new ApiError(msg, code)
  }
  return json.data as T
}
