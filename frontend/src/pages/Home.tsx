import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  Share2,
  BarChart3,
  Shield,
  BrainCircuit,
  Clock,
  ListChecks,
  Check,
  Copy,
  Link2,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

type Step = 1 | 2 | 3

const steps = [
  {
    id: 1 as Step,
    title: 'Define your questions',
    description: 'Write clear prompts and options your voters understand.',
    icon: ListChecks
  },
  {
    id: 2 as Step,
    title: 'Set permissions & expiry',
    description: 'Control who can vote and how long the poll stays open.',
    icon: Shield
  },
  {
    id: 3 as Step,
    title: 'Share and watch live',
    description: 'Distribute your link and watch results update in real time.',
    icon: Share2
  }
]

const features = [
  {
    title: 'Create Polls in Seconds',
    description: 'Our intuitive builder lets you launch polls instantly without complex setups.',
    icon: Zap
  },
  {
    title: 'Share Anywhere with One Link',
    description: 'Distribute via Slack, email, or social media. No sign-up required for voters.',
    icon: Share2
  },
  {
    title: 'Real-Time Live Analytics',
    description: 'Watch the votes stream in live with dynamic, auto-refreshing charts.',
    icon: BarChart3
  },
  {
    title: 'Anonymous or Authenticated',
    description: 'Choose whether to collect names and emails or keep responses strictly private.',
    icon: Shield
  },
  {
    title: 'Smart Audience Insights',
    description: 'Understand device types, locations, and response trends effortlessly.',
    icon: BrainCircuit
  },
  {
    title: 'Auto-Expiry & Result Publishing',
    description: 'Set a timer for your poll and automatically reveal results when it ends.',
    icon: Clock
  }
]


const trendData = [
  { time: '08:00', responses: 12 },
  { time: '10:00', responses: 45 },
  { time: '12:00', responses: 85 },
  { time: '14:00', responses: 110 },
  { time: '16:00', responses: 60 },
  { time: '18:00', responses: 25 }
]

export default function Home() {
  const [activeStep, setActiveStep] = useState<Step>(1)
  const [anonymousVoting, setAnonymousVoting] = useState(true)
  const [heroSelection, setHeroSelection] = useState<string | null>('react')
  const [copied, setCopied] = useState(false)

  const liveUrlBase = import.meta.env.VITE_APP_URL || 'http://localhost:5173'
  const mockLiveUrl = `${liveUrlBase}/p/abc123`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mockLiveUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900">
            <span className="text-yellow-500">⚡</span> VoteZap
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">How it Works</a>
            <a href="#analytics" className="transition-colors hover:text-slate-900">Analytics</a>
          </nav>
          <Link
            to="/login"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-95"
          >
            Login / Start Building
          </Link>
        </div>
      </header>

      <main>
        <section className="bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center lg:gap-16 lg:py-32">
            <div className="flex-1 space-y-8 lg:w-1/2">
              <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
                Create Polls. <br className="hidden sm:block" />
                <span className="text-slate-500">Get Insights.</span> <br className="hidden sm:block" />
                Make Better Decisions.
              </h1>
              <p className="max-w-lg text-lg text-slate-600 leading-relaxed">
                Launch polished polls in minutes, collect honest responses, and see live results your team can trust with our modern polling platform.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl active:translate-y-0"
                >
                  Get started free
                </Link>
              </div>
            </div>

            <div className="flex-1 lg:w-1/2 relative">
              <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-3xl bg-slate-100" />
              <div className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Favorite JS Framework?</h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-600/20">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    Live
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    { id: 'react', label: 'React' },
                    { id: 'vue', label: 'Vue' },
                    { id: 'svelte', label: 'Svelte' }
                  ].map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => setHeroSelection(opt.id)}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-5 py-4 text-left font-medium transition-all ${heroSelection === opt.id
                          ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-base">{opt.label}</span>
                        <span
                          className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${heroSelection === opt.id ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                            }`}
                        >
                          {heroSelection === opt.id && <span className="size-2 rounded-full bg-white" />}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
                >
                  Submit Vote
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-slate-200 bg-slate-50 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 max-w-2xl">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Features</span>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">Why VoteZap</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => (
                <div key={idx} className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50">
                  <div className="mb-5 inline-flex rounded-2xl bg-slate-50 p-4 text-slate-900 ring-1 ring-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-slate-200 bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">How VoteZap works</h2>
            </div>

            <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
              <div className="flex-1 space-y-4 lg:w-1/2">
                {steps.map((step) => {
                  const Icon = step.icon
                  const selected = activeStep === step.id
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={`flex w-full gap-5 rounded-3xl border-2 p-6 text-left transition-all ${selected
                        ? 'border-slate-900 bg-white shadow-xl shadow-slate-200/50 scale-[1.02]'
                        : 'border-transparent bg-slate-50 hover:bg-slate-100'
                        }`}
                    >
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${selected ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'
                          }`}
                      >
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${selected ? 'text-slate-900' : 'text-slate-500'}`}>Step {step.id}</p>
                        <p className="text-lg font-bold text-slate-900">{step.title}</p>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{step.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex-1 lg:w-1/2">
                <div className="h-full min-h-[400px] rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

                  {activeStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                      <div className="flex items-center gap-3 text-base font-bold text-slate-900 border-b border-slate-200 pb-4">
                        <div className="rounded-lg bg-white p-2 shadow-sm"><ListChecks className="size-5 text-slate-900" /></div>
                        Question Builder
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Poll Question</label>
                          <input
                            type="text"
                            readOnly
                            defaultValue="Which feature should we ship first?"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none ring-slate-900 focus:ring-2"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Options</label>
                          <div className="space-y-3">
                            {['Dark mode polish', 'CSV export', 'API webhooks'].map((label, i) => (
                              <div
                                key={label}
                                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                              >
                                <span className="text-slate-400 font-mono text-xs">{i + 1}</span>
                                <span className="text-sm font-medium text-slate-700">{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                      <div className="flex items-center gap-3 text-base font-bold text-slate-900 border-b border-slate-200 pb-4">
                        <div className="rounded-lg bg-white p-2 shadow-sm"><Shield className="size-5 text-slate-900" /></div>
                        Permissions & Settings
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">Anonymous voting</p>
                          <p className="text-sm text-slate-500 mt-1">Hide voter identities from results.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={anonymousVoting}
                          onClick={() => setAnonymousVoting((v) => !v)}
                          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${anonymousVoting ? 'bg-slate-900' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${anonymousVoting ? 'translate-x-6' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="font-bold text-slate-900 mb-3">Poll Expiry</p>
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <Clock className="size-4 text-slate-400" />
                          Closes automatically on <span className="font-bold text-slate-900">Feb 28, 6:00 PM</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 h-full flex flex-col">
                      <div className="flex items-center gap-3 text-base font-bold text-slate-900 border-b border-slate-200 pb-4">
                        <div className="rounded-lg bg-white p-2 shadow-sm"><Share2 className="size-5 text-slate-900" /></div>
                        Share & Go Live
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Public Link</label>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm overflow-hidden">
                            <Link2 className="size-5 shrink-0 text-slate-400" />
                            <span className="truncate font-mono text-sm text-slate-700">{mockLiveUrl}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopy()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 whitespace-nowrap"
                          >
                            {copied ? (
                              <><Check className="size-4" /> Copied</>
                            ) : (
                              <><Copy className="size-4" /> Copy Link</>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Preview</p>
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            </span>
                            Live
                          </span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-4">
                          {[
                            { label: 'Dark mode polish', votes: 145, pct: 45 },
                            { label: 'CSV export', votes: 98, pct: 30 },
                            { label: 'API webhooks', votes: 81, pct: 25 }
                          ].map((item, i) => (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium text-slate-600">
                                <span>{item.label}</span>
                                <span className="font-bold text-slate-900">{item.pct}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${item.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="analytics" className="border-t border-slate-200 bg-slate-50 py-24 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Analytics</span>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
                More Than Just Counts — Real Audience Intelligence
              </h2>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-rose-400" />
                  <div className="size-3 rounded-full bg-amber-400" />
                  <div className="size-3 rounded-full bg-emerald-400" />
                </div>
                <div className="mx-auto flex h-6 w-full max-w-md items-center justify-center rounded-md bg-white px-3 text-[10px] font-medium text-slate-400 shadow-sm ring-1 ring-slate-200">
                  votezap.app/analytics/p_abc123
                </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50/50">

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                  {[
                    { label: 'Total Responses', value: '1,248', icon: TrendingUp },
                    { label: 'Completion Rate', value: '94.2%', icon: Check },
                    { label: 'Avg Time', value: '42s', icon: Clock },
                    { label: 'Avg Rating', value: '4.8/5', icon: BrainCircuit }
                  ].map((stat, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3 text-slate-500">
                        <stat.icon className="size-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">{stat.label}</h3>
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 mb-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Question 1: Favorite JS Framework?</h3>
                    <div className="space-y-6">
                      {[
                        { label: 'React', votes: 645, pct: 52 },
                        { label: 'Vue', votes: 312, pct: 25 },
                        { label: 'Svelte', votes: 187, pct: 15 },
                        { label: 'Solid', votes: 104, pct: 8 }
                      ].map((item, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm font-medium text-slate-700">
                            <span>{item.label}</span>
                            <span className="font-bold text-slate-900">{item.votes} votes ({item.pct}%)</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-slate-900 rounded-full" style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Response Trend (Today)</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="responses" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                      Recent Feedback
                      <MessageSquare className="size-4 text-slate-400" />
                    </h3>
                    <div className="space-y-4 flex-1 overflow-hidden">
                      {[
                        { user: 'Anonymous', time: '2m ago', text: 'Love the new dark mode concept!' },
                        { user: 'Sarah T.', time: '15m ago', text: 'CSV export would save me hours.' },
                        { user: 'Anonymous', time: '1h ago', text: 'Webhooks are essential for our workflow.' },
                        { user: 'Mike R.', time: '2h ago', text: 'Keep it simple, focus on speed.' }
                      ].map((fb, i) => (
                        <div key={i} className="text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span className="font-semibold text-slate-600">{fb.user}</span>
                            <span>{fb.time}</span>
                          </div>
                          <p className="text-slate-700">{fb.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <span>⚡</span> VoteZap
          </div>
          <div>
            © {new Date().getFullYear()} VoteZap. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
