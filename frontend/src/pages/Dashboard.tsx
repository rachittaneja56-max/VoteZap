import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Copy,
  BarChart,
  Activity,
  CheckCircle,
  Users,
  FileText,
  Loader2,
  Home as HomeIcon,
  Rocket
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { apiFetch, parseJsonResponse, ApiError, pollShareUrl } from '../lib/api'
import type { PollListRow } from '../types/poll'
import CreatePollModal from '../components/CreatePollModal'
import SessionBadge from '../components/SessionBadge'
import { useAuth } from '../lib/auth-context'

function rowStatus(p: PollListRow): 'Active' | 'Expired' | 'Published' {
  if (p.isPublished) return 'Published'
  if (new Date(p.expiresAt).getTime() <= Date.now()) return 'Expired'
  return 'Active'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [polls, setPolls] = useState<PollListRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchPolls = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await parseJsonResponse<{ polls: PollListRow[] }>(
        await apiFetch('/polls', { method: 'GET' })
      )
      setPolls(data.polls ?? [])
    } catch (e) {
      if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
        if (user) {
          void logout()
        }
        setLoadError('Please sign in to view your dashboard.')
      } else {
        setLoadError(e instanceof Error ? e.message : 'Failed to load polls')
      }
      setPolls([])
    } finally {
      setIsLoading(false)
    }
  }, [logout, user])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchPolls()
    })
  }, [fetchPolls])

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const status = rowStatus(poll)
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Active' && status === 'Active') ||
        (filter === 'Expired' && (status === 'Expired' || status === 'Published'))
      const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [polls, filter, searchQuery])

  const totalResponses = useMemo(() => polls.reduce((s, p) => s + p.responseCount, 0), [polls])

  const avgCompletionLabel = useMemo(() => {
    if (!polls.length) return '--'
    const withResponses = polls.filter((p) => p.responseCount > 0).length
    return `${Math.min(100, Math.round((withResponses / polls.length) * 100))}%`
  }, [polls])

  const sparkData = useMemo(() => {
    const sorted = [...polls].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    let acc = 0
    const slice = sorted.slice(-7)
    if (!slice.length) {
      return [
        { name: '1', votes: 0 },
        { name: '2', votes: 0 },
        { name: '3', votes: 0 }
      ]
    }
    return slice.map((p, i) => {
      acc += p.responseCount
      return { name: String(i + 1), votes: acc }
    })
  }, [polls])

  const handleCopyLink = async (pollId: string) => {
    const url = pollShareUrl(pollId)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(pollId)
      window.setTimeout(() => setCopiedId((id) => (id === pollId ? null : id)), 2000)
    } catch {
      setCopiedId(null)
    }
  }

  const handlePublish = async (pollId: string) => {
    try {
      await parseJsonResponse(
         await apiFetch(`/polls/${pollId}/publish`, { method: 'POST' })
        )
      void fetchPolls()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Publish failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <CreatePollModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPollCreated={(id) => navigate(`/analytics/${id}`)}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              title="Return Home"
            >
              <HomeIcon className="size-5" aria-hidden />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Overview</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500">
                Welcome back, <span className="text-slate-900 font-bold">{user?.name || user?.email || 'User'}</span>. Here&apos;s your activity.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Create New Poll
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <SessionBadge />
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
            {loadError.includes('sign in') && (
              <Link to="/login" className="ml-2 font-semibold text-blue-600 underline hover:text-blue-700">
                Go to login
              </Link>
            )}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Polls
              </span>
              <FileText className="size-4 text-slate-400" aria-hidden />
            </div>
            <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {isLoading ? '--' : polls.length}
            </span>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Responses
              </span>
              <Users className="size-4 text-slate-400" aria-hidden />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {isLoading ? '--' : totalResponses.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Avg. Completion
              </span>
              <CheckCircle className="size-4 text-slate-400" aria-hidden />
            </div>
            <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {isLoading ? '--' : avgCompletionLabel}
            </span>
            <p className="mt-1 text-xs font-medium text-slate-500">Share of polls with responses</p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Activity Trend
              </span>
              <Activity className="size-4 text-slate-400" aria-hidden />
            </div>
            <div className="mt-auto h-20 min-h-20 w-full">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Line
                      type="monotone"
                      dataKey="votes"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Your Polls</h2>
          <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>
          <div className="flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
            {['All', 'Active', 'Expired'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                disabled={isLoading}
                className={`flex-1 rounded-lg px-5 py-2 text-sm font-bold transition-all sm:flex-none ${filter === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  } disabled:opacity-50`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Poll Name</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Responses</th>
                  <th className="whitespace-nowrap px-4 py-3">Leading Option</th>
                  <th className="whitespace-nowrap px-4 py-3">Created Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Loader2 className="mx-auto size-8 animate-spin text-slate-400" aria-hidden />
                      <p className="mt-2 text-sm font-medium text-slate-500">Loading polls...</p>
                    </td>
                  </tr>
                ) : filteredPolls.length > 0 ? (
                  filteredPolls.map((poll) => {
                    const status = rowStatus(poll)
                    return (
                      <tr key={poll.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="max-w-[220px] truncate px-4 py-3">
                          <span className="font-semibold tracking-tight text-slate-900">{poll.title}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                            <span
                              className={`size-1.5 shrink-0 rounded-full ${status === 'Active'
                                ? 'bg-emerald-500'
                                : status === 'Published'
                                  ? 'bg-blue-500'
                                  : 'bg-slate-400'
                                }`}
                            />
                            {status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                          {poll.responseCount.toLocaleString()}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                          {poll.leadingOption}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {new Date(poll.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {!poll.isPublished && (
                              <button
                                type="button"
                                title="Publish results"
                                onClick={() => void handlePublish(poll.id)}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100"
                              >
                                <Rocket className="size-4" aria-hidden />
                                <span className="sr-only">Publish</span>
                              </button>
                            )}
                            <button
                              type="button"
                              title="Copy poll link"
                              onClick={() => void handleCopyLink(poll.id)}
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                            >
                              <Copy className="size-4" aria-hidden />
                              <span className="sr-only">Copy link</span>
                            </button>
                            <Link
                              to={`/analytics/${poll.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 ring-1 ring-blue-600/15 transition-colors hover:bg-blue-100 hover:text-blue-800"
                            >
                              <BarChart className="size-4 shrink-0" aria-hidden />
                              Analytics
                            </Link>
                          </div>
                          {copiedId === poll.id && (
                            <span className="mt-1 block text-[11px] font-medium text-emerald-600">Copied</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-sm font-medium text-slate-500">
                      No polls found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
