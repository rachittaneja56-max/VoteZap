const PKCE_VERIFIER_KEY = 'votezap_pkce_verifier'
const OAUTH_STATE_KEY = 'votezap_oauth_state'

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export function generateRandomString(length: number): string {
  const values = new Uint8Array(length)
  crypto.getRandomValues(values)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += CHARSET[values[i]! % CHARSET.length]!
  }
  return result
}

export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function storePkceSession(verifier: string, state: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
}

export function readPkceSession(): { verifier: string; state: string } | null {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  const state = sessionStorage.getItem(OAUTH_STATE_KEY)
  if (!verifier || !state) return null
  return { verifier, state }
}

export function clearPkceSession(): void {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
}
