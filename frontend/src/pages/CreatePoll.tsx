import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, X } from 'lucide-react'

type PollQuestion = {
  id: string
  text: string
  isMandatory: boolean
  options: string[]
}

type PollSettings = {
  expiry: string
  isAnonymous: boolean
}

function newQuestion(): PollQuestion {
  return {
    id: crypto.randomUUID(),
    text: '',
    isMandatory: true,
    options: ['', '']
  }
}

export default function CreatePoll() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [settings, setSettings] = useState<PollSettings>({
    expiry: '',
    isAnonymous: true
  })
  const [questions, setQuestions] = useState<PollQuestion[]>(() => [newQuestion()])

  const updateQuestion = (id: string, patch: Partial<Omit<PollQuestion, 'id' | 'options'>>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    )
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        const next = [...q.options]
        next[optionIndex] = value
        return { ...q, options: next }
      })
    )
  }

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, options: [...q.options, ''] } : q))
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        if (q.options.length <= 2) return q
        return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
      })
    )
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newQuestion()])
  }

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.id !== questionId)))
  }

  const handleCreatePoll = () => {
    const payload = { title, settings, questions }
    console.log('Create poll', payload)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Create a New Poll
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Build questions, options, and settings—everything updates live in the form below.
        </p>

        <div className="mt-8 space-y-8">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <label htmlFor="poll-title" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Poll title
            </label>
            <input
              id="poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q1 Team priorities"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-lg font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </section>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <section
                key={question.id}
                className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Question {qIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length <= 1}
                    title="Remove question"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-5" aria-hidden />
                    <span className="sr-only">Delete question</span>
                  </button>
                </div>

                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Question text
                </label>
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                  placeholder="What do you want to ask?"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F8FAFC] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Mandatory question</p>
                    <p className="text-xs text-slate-500">Voters must answer before submitting</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={question.isMandatory}
                    onClick={() =>
                      updateQuestion(question.id, { isMandatory: !question.isMandatory })
                    }
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      question.isMandatory ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-7 rounded-full bg-white shadow ring-0 transition duration-200 ease-out ${
                        question.isMandatory ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Options</p>
                  <ul className="mt-3 space-y-2">
                    {question.options.map((opt, oIndex) => (
                      <li key={`${question.id}-opt-${oIndex}`} className="flex items-center gap-2">
                        <span className="w-6 shrink-0 text-center text-xs font-mono text-slate-400">
                          {oIndex + 1}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(question.id, oIndex)}
                          disabled={question.options.length <= 2}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-25"
                          title="Remove option"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => addOption(question.id)}
                    className="mt-3 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                  >
                    + Add Option
                  </button>
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
          >
            ➕ Add Another Question
          </button>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Poll settings</h2>

            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Anonymous voting</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hide voter identities vs. require login to vote
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.isAnonymous}
                onClick={() =>
                  setSettings((s) => ({ ...s, isAnonymous: !s.isAnonymous }))
                }
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.isAnonymous ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-7 rounded-full bg-white shadow transition duration-200 ease-out ${
                    settings.isAnonymous ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="mt-8">
              <label
                htmlFor="poll-expiry"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Expiry date &amp; time
              </label>
              <input
                id="poll-expiry"
                type="datetime-local"
                value={settings.expiry}
                onChange={(e) => setSettings((s) => ({ ...s, expiry: e.target.value }))}
                className="mt-2 w-full max-w-md rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/95 py-4 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-3 px-4 sm:flex-row sm:justify-end sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="order-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:order-1 sm:min-w-[120px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreatePoll}
            className="order-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 sm:order-2 sm:min-w-[180px]"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  )
}
