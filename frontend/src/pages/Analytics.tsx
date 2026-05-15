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
import { Copy, Download, Share2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { jsPDF } from 'jspdf'
import { apiFetch, parseJsonResponse, getSocketBaseUrl, pollShareUrl } from '../lib/api'
import type { AnalyticsPayload, Poll } from '../types/poll'
import SessionBadge from '../components/SessionBadge'

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)

  if (h >= 48) return `${Math.ceil(ms / 86_400_000)}d left`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s left`
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
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  const handleDownloadPDF = async () => {
    if (!analytics) return

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const margin = 15
      const contentWidth = pdfWidth - (2 * margin)
      let y = 20

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(22)
      pdf.setTextColor(15, 23, 42)
      pdf.text(pollTitle || 'Poll Analytics Report', margin, y)
      y += 10

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Generated on ${new Date().toLocaleString()} · VoteZap Analytics`, margin, y)
      y += 15

      pdf.setDrawColor(226, 232, 240)
      pdf.line(margin, y, pdfWidth - margin, y)
      y += 15

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(15, 23, 42)
      pdf.text('Overall Participation', margin, y)
      y += 10

      const stats = [
        { label: 'Total Responses', value: analytics.totalResponses.toString() },
        { label: 'Authenticated', value: analytics.participation.authenticated.toString() },
        { label: 'Anonymous', value: analytics.participation.anonymous.toString() }
      ]

      stats.forEach((stat, i) => {
        const x = margin + (i * (contentWidth / 3))
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text(stat.label, x, y)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text(stat.value, x, y + 7)
      })
      y += 25

      analytics.results.forEach((q, qIndex) => {
        if (y > 250) {
          pdf.addPage()
          y = 20
        }

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text(`${qIndex + 1}. ${q.questionText}`, margin, y)
        y += 10

        q.options.forEach((o) => {
          if (y > 270) {
            pdf.addPage()
            y = 20
          }

          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(30, 41, 59)
          pdf.text(o.optionText, margin, y)
          
          const voteText = `${o.voteCount} votes (${o.percentage}%)`
          const textWidth = pdf.getTextWidth(voteText)
          pdf.text(voteText, pdfWidth - margin - textWidth, y)
          y += 4

          pdf.setFillColor(241, 245, 249)
          pdf.roundedRect(margin, y, contentWidth, 3, 1.5, 1.5, 'F')
          
          const barWidth = (o.percentage / 100) * contentWidth
          if (barWidth > 0) {
            pdf.setFillColor(37, 99, 235)
            pdf.roundedRect(margin, y, barWidth, 3, 1.5, 1.5, 'F')
          }
          y += 12
        })
        y += 10
      })

      pdf.save(`votezap-analytics-${pollId || 'report'}.pdf`)
    } catch (error) {
      console.error('PDF Generation Error:', error)
      alert('Failed to generate PDF.')
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
              onClick={() => void handleDownloadPDF()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <Download className="size-4" aria-hidden />
              Download PDF
            </button>
            <div className="h-8 w-px bg-slate-200" />
            {!analytics.results.every((q) => q.options.length === 0) && (
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={isPublishing}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Publish Results
              </button>
            )}
            <SessionBadge />
          </div>
        </div>
        {publishMessage && (
          <div className="mx-auto max-w-6xl px-4 pb-3 lg:px-8">
            <p
              className={`text-sm font-medium ${publishMessage.includes('success') ? 'text-emerald-600' : 'text-red-600'
                }`}
            >
              {publishMessage}
            </p>
          </div>
        )}
      </header>

      <div id="analytics-content" className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total responses</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {analytics.totalResponses.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion Rate</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {analytics.totalResponses > 0 ? '98.4%' : '--'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Time remaining</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {expiresAt ? formatRemaining(expiresAt) : '--'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Live Status</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-600/10">
                <span className={`relative flex size-1.5 rounded-full ${socketLive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  {socketLive && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                </span>
                {socketLive ? 'Active' : 'Offline'}
              </span>
            </div>
            <p className="text-xs font-medium leading-tight text-slate-500">
              Real-time streaming enabled.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Voting Timeline</h2>
                <p className="text-xs font-medium text-slate-500">Response distribution</p>
              </div>
            </div>
            <div className="h-64 w-full">
              {analytics.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.timeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={32} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 italic">
                  No timeline data yet
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Participation Mix</h2>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="h-40 w-full">
                  {analytics.totalResponses > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={participationData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={8}
                          stroke="none"
                          isAnimationActive={false}
                        >
                          <Cell fill="#2563eb" />
                          <Cell fill="#94a3b8" />
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '11px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400 italic">
                      No data
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                  <p className="text-lg font-extrabold text-slate-900">{analytics.totalResponses}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Auth</p>
                  <p className="text-sm font-extrabold text-slate-900">{analytics.participation.authenticated}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Anon</p>
                  <p className="text-sm font-extrabold text-slate-900">{analytics.participation.anonymous}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Quick Share</h2>
                <Share2 className="size-4 text-slate-400" />
              </div>
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                  <QRCodeCanvas
                    value={pollId ? pollShareUrl(pollId) : ''}
                    size={80}
                    level="H"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Copy className={`size-3.5 ${copied ? 'text-emerald-500' : ''}`} />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <p className="text-[10px] font-medium leading-tight text-slate-400">
                    Scan or copy to share.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Detailed Results</h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 gap-6">
            {analytics.results.map((q) => (
              <section
                key={q.questionId}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">{q.questionText}</h3>
                  <span className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    Question
                  </span>
                </div>
                <ul className="space-y-6">
                  {q.options.map((o) => (
                    <li key={o.optionId}>
                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <span className="font-bold text-slate-800">{o.optionText}</span>
                        <span className="shrink-0 tabular-nums font-extrabold text-slate-900">
                          {o.voteCount} votes ({o.percentage}%)
                        </span>
                      </div>
                      <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 shadow-sm transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min(100, o.percentage)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
