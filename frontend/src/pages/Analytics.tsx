import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Copy } from 'lucide-react'
import { apiFetch, parseJsonResponse, getSocketBaseUrl, pollShareUrl } from '../lib/api'
import type { AnalyticsPayload, Poll } from '../types/poll'
import SessionBadge from '../components/SessionBadge'

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#64748b']

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 48) return `${Math.ceil(ms / 86_400_000)}d left`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m left`
}

export default function Analytics() {
  const { pollId } = useParams<{ pollId: string }>()
  const [pollTitle, setPollTitle] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [socketLive, setSocketLive] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)

  const loadInitial = useCallback(async () => {
    if (!pollId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [pollEnvelope, analyticsData] = await Promise.all([
        parseJsonResponse<{ poll: Poll }>(await apiFetch(`/polls/${pollId}`, { method: 'GET' })),
        parseJsonResponse<AnalyticsPayload>(await apiFetch(`/polls/${pollId}/analytics`, { method: 'GET' }))
      ])
      setPollTitle(pollEnvelope.poll.title)
      setExpiresAt(pollEnvelope.poll.expiresAt)
      setAnalytics(analyticsData)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load analytics')
      setAnalytics(null)
    } finally {
      setIsLoading(false)
    }
  }, [pollId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadInitial()
    })
  }, [loadInitial])

  useEffect(() => {
    if (!pollId) return
    const socket: Socket = io(getSocketBaseUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })

    const onConnect = () => {
      setSocketLive(true)
      socket.emit('joinRoom', pollId)
    }

    const onDisconnect = () => {
      setSocketLive(false)
    }

    const onAnalyticsUpdate = (payload: AnalyticsPayload) => {
      setAnalytics(payload)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('analyticsUpdate', onAnalyticsUpdate)
    socket.on('new-response', onAnalyticsUpdate)

    return () => {
      if (socket.connected) {
        socket.emit('leaveRoom', pollId)
        socket.emit('leave-poll-room', pollId)
      }
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('analyticsUpdate', onAnalyticsUpdate)
      socket.off('new-response', onAnalyticsUpdate)
      socket.disconnect()
    }
  }, [pollId])

  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    if (!pollId) return
    const url = pollShareUrl(pollId)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handlePublish = async () => {
    if (!pollId) return
    setIsPublishing(true)
    setPublishMessage(null)
    try {
      await parseJsonResponse(await apiFetch(`/polls/${pollId}/publish`, { method: 'POST' }))
      setPublishMessage('Results published successfully.')
    } catch (e) {
      setPublishMessage(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setIsPublishing(false)
    }
  }

  const participationData = useMemo(() => {
    if (!analytics) return []
    return [
      { name: 'Anonymous', value: analytics.participation.anonymous },
      { name: 'Authenticated', value: analytics.participation.authenticated }
    ]
  }, [analytics])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
      </div>
    )
  }

  if (loadError || !analytics) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <p className="text-center text-sm font-medium text-slate-600">{loadError}</p>
        {loadError && (loadError.includes('sign') || loadError.includes('Authentication')) && (
          <Link
            to="/login"
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
        )}
        <Link to="/dashboard" className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-blue-600"
              >
                Dashboard
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium uppercase tracking-wide text-blue-600">Analytics</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{pollTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              title="Copy poll link"
              onClick={() => void handleCopyLink()}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <Copy className={`size-4 ${copied ? 'text-emerald-500' : ''}`} aria-hidden />
            </button>
            {!analytics.results.every((q) => q.options.length === 0) && (
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={isPublishing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Publish Results
              </button>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-600">
              <span
                className={`relative flex size-2 rounded-full ${socketLive ? 'bg-red-500' : 'bg-slate-300'}`}
              >
                {socketLive && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                )}
              </span>
              {socketLive ? 'Live' : 'Offline'}
            </span>
            <div className="h-8 w-px bg-slate-200" />
            <SessionBadge />
          </div>
        </div>
        {publishMessage && (
          <div className="mx-auto max-w-6xl px-4 pb-3 lg:px-8">
            <p
              className={`text-sm font-medium ${
                publishMessage.includes('success') ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {publishMessage}
            </p>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total responses</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {analytics.totalResponses.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Participation</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {analytics.participation.authenticated}
              </p>
              <p className="text-sm font-medium text-slate-500">Authenticated</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Time remaining</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {expiresAt ? formatRemaining(expiresAt) : '--'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {analytics.results.map((q) => (
              <section
                key={q.questionId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">{q.questionText}</h2>
                <ul className="mt-4 space-y-3">
                  {q.options.map((o) => (
                    <li key={o.optionId}>
                      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
                        <span className="truncate text-slate-800">{o.optionText}</span>
                        <span className="shrink-0 tabular-nums text-slate-600">
                          {o.voteCount} ({o.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, o.percentage)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Voting Timeline</h2>
              <p className="text-xs font-medium text-slate-500">Daily response counts</p>
              <div className="mt-4 h-64 min-h-[256px] w-full">
                {analytics.timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.timeline} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                    No timeline data yet
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Participation Mix</h2>
              <p className="text-xs font-medium text-slate-500">Anonymous vs Authenticated</p>
              <div className="mt-4 h-64 min-h-[256px] w-full">
                {analytics.totalResponses > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={participationData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        <Cell fill="#2563eb" />
                        <Cell fill="#94a3b8" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                    No data
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-center gap-4 text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <div className="size-2 rounded-full bg-blue-600" />
                  Auth
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <div className="size-2 rounded-full bg-slate-400" />
                  Anon
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
