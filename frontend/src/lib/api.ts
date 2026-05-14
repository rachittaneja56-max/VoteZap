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

export function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL
  if (!base || typeof base !== 'string') {
    throw new Error('VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env')
  }
  return base.replace(/\/$/, '')
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
  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`
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
    throw new Error(msg)
  }
  return json.data
}
