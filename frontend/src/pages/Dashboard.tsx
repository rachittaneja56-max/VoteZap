import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Copy,
  BarChart,
  Activity,
  CheckCircle,
  Users,
  FileText
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const mockActivityData = [
  { name: 'Day 1', votes: 120 },
  { name: 'Day 2', votes: 210 },
  { name: 'Day 3', votes: 180 },
  { name: 'Day 4', votes: 290 },
  { name: 'Day 5', votes: 250 },
  { name: 'Day 6', votes: 340 },
  { name: 'Day 7', votes: 420 }
]

const mockPolls = [
  {
    id: '1',
    name: 'Favorite JS Framework',
    status: 'Active',
    responses: 1452,
    leadingOption: 'React (45%)',
    createdAt: 'Oct 24, 2026'
  },
  {
    id: '2',
    name: 'Q3 All-Hands Feedback',
    status: 'Expired',
    responses: 310,
    leadingOption: 'Very Satisfied (68%)',
    createdAt: 'Sep 12, 2026'
  },
  {
    id: '3',
    name: 'Next Office Location',
    status: 'Active',
    responses: 89,
    leadingOption: 'New York (52%)',
    createdAt: 'Oct 26, 2026'
  },
  {
    id: '4',
    name: 'Product Roadmap Q4',
    status: 'Active',
    responses: 2450,
    leadingOption: 'AI Features (38%)',
    createdAt: 'Oct 20, 2026'
  },
  {
    id: '5',
    name: 'Holiday Party Theme',
    status: 'Expired',
    responses: 421,
    leadingOption: '80s Retro (41%)',
    createdAt: 'Aug 05, 2026'
  }
]

function pollShareUrl(pollId: string): string {
  const base = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin
  return `${base}/p/${pollId}`
}

export default function Dashboard() {
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredPolls = mockPolls.filter((poll) => {
    const matchesFilter = filter === 'All' || poll.status === filter
    const matchesSearch = poll.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, Creator. Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            Create New Poll
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Polls
              </span>
              <FileText className="size-4 text-slate-400" aria-hidden />
            </div>
            <span className="text-3xl font-bold tabular-nums text-slate-900">12</span>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Responses
              </span>
              <Users className="size-4 text-slate-400" aria-hidden />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-bold tabular-nums text-slate-900">4,521</span>
              <span className="mb-0.5 inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/15">
                +12% this week
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Avg Completion
              </span>
              <CheckCircle className="size-4 text-slate-400" aria-hidden />
            </div>
            <span className="text-3xl font-bold tabular-nums text-slate-900">94%</span>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Activity Trend
              </span>
              <Activity className="size-4 text-slate-400" aria-hidden />
            </div>
            <div className="mt-auto h-12 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockActivityData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
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
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search polls…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
            {['All', 'Active', 'Expired'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                  filter === tab
                    ? 'bg-[#F8FAFC] text-slate-900 ring-1 ring-slate-200/80'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Poll Name</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Responses</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Leading Option</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Created Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPolls.length > 0 ? (
                  filteredPolls.map((poll) => (
                    <tr key={poll.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="max-w-[220px] truncate px-4 py-3">
                        <span className="font-semibold text-slate-900">{poll.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              poll.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {poll.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                        {poll.responses.toLocaleString()}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">{poll.leadingOption}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{poll.createdAt}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/15 transition-colors hover:bg-blue-100 hover:text-blue-800"
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-500">
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
