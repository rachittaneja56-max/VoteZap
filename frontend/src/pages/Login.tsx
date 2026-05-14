import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { apiFetch, getStaticAuthConfig, parseJsonResponse } from '../lib/api'
import {
  generateRandomString,
  sha256Base64Url,
  storePkceSession
} from '../lib/pkce'

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client'

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  const existingScript = document.querySelector(`script[src="${GSI_SCRIPT}"]`) as HTMLScriptElement
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
}

export default function Login() {
  const navigate = useNavigate()
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const config = getStaticAuthConfig()
  const [oauthBusy, setOauthBusy] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)

  useEffect(() => {
    if (!config.googleClientId || !googleBtnRef.current) return

    let cancelled = false

    const setupGoogle = async () => {
      try {
        await loadGsiScript()
        if (cancelled || !googleBtnRef.current || !window.google?.accounts?.id) return

        googleBtnRef.current.innerHTML = ''

        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async (response) => {
            setOauthError(null)
            setOauthBusy(true)
            try {
              const res = await apiFetch('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify({ idToken: response.credential })
              })
              const data = await parseJsonResponse(res)
              localStorage.setItem('user', JSON.stringify(data))
              navigate('/', { replace: true })
            } catch (e) {
              setOauthError(e instanceof Error ? e.message : 'Google sign-in failed')
            } finally {
              setOauthBusy(false)
            }
          }
        })

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: '100%'
        })
      } catch (e) {
        if (!cancelled) {
          setOauthError(e instanceof Error ? e.message : 'Google Sign-In unavailable')
        }
      }
    }

    void setupGoogle()

    return () => {
      cancelled = true
      window.google?.accounts?.id?.cancel()
    }
  }, [config.googleClientId, navigate])

  const startRachitsAuth = async () => {
    setOauthError(null)
    setOauthBusy(true)
    try {
      if (!config.customIdpUrl || !config.customIdpClientId || !config.customIdpRedirectUri) {
        throw new Error('RachitsAuth is not configured. Check the frontend environment file.')
      }

      const verifier = generateRandomString(64)
      const state = generateRandomString(32)
      const challenge = await sha256Base64Url(verifier)
      storePkceSession(verifier, state)

      const base = config.customIdpUrl.replace(/\/$/, '')
      const url = new URL(`${base}/api/auth/authorize`)
      url.searchParams.set('client_id', config.customIdpClientId)
      url.searchParams.set('redirect_uri', config.customIdpRedirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'openid profile email')
      url.searchParams.set('state', state)
      url.searchParams.set('code_challenge', challenge)
      url.searchParams.set('code_challenge_method', 'S256')

      window.location.assign(url.toString())
    } catch (e) {
      setOauthBusy(false)
      setOauthError(e instanceof Error ? e.message : 'Could not start login')
    }
  }

  const ZapIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
    </svg>
  )

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 selection:bg-slate-200">
      <div className="p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">

          <div className="mb-10 text-center flex flex-col items-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100/50 drop-shadow-sm">
              <ZapIcon className="size-8 text-[#ff6b35]" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">Welcome to VoteZap</h1>
            <p className="mt-3 text-[15px] text-slate-500">Sign in to create polls and track live results.</p>
          </div>

          <div className="flex flex-col gap-4">
            {oauthError && (
              <p className="rounded-xl bg-red-50 p-4 text-center text-sm font-medium text-red-700">{oauthError}</p>
            )}

            <div className="flex min-h-[56px] flex-col items-center justify-center gap-2">
              <div
                ref={googleBtnRef}
                className="flex w-full justify-center [&>div]:w-full [&_iframe]:mx-auto"
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="button"
              onClick={() => void startRachitsAuth()}
              disabled={oauthBusy}
              className="group relative flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[#0f172a] px-4 text-[15px] font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#0f172a] disabled:hover:scale-100"
            >
              {oauthBusy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ZapIcon className="size-5 text-[#ff6b35]" />
              )}
              Continue with RachitsAuth
            </button>
          </div>

          <p className="mt-8 text-center text-[13px] font-medium text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>

        </div>
      </div>
    </div>
  )
}
