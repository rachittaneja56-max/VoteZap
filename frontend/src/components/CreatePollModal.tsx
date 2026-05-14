import { useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { apiFetch, parseJsonResponse } from '../lib/api'

type ModalQuestion = {
  id: string
  text: string
  isMandatory: boolean
  options: string[]
}

type PollSettings = {
  expiry: string
  isAnonymous: boolean
}

export interface CreatePollModalProps {
  open: boolean
  onClose: () => void
  onPollCreated: (pollId: string) => void
}

function newQuestion(): ModalQuestion {
  return {
    id: crypto.randomUUID(),
    text: '',
    isMandatory: true,
    options: ['', '']
  }
}

export default function CreatePollModal({ open, onClose, onPollCreated }: CreatePollModalProps) {
  const [title, setTitle] = useState('')
  const [settings, setSettings] = useState<PollSettings>({ expiry: '', isAnonymous: true })
  const [questions, setQuestions] = useState<ModalQuestion[]>(() => [newQuestion()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const resetForm = () => {
    setTitle('')
    setSettings({ expiry: '', isAnonymous: true })
    setQuestions([newQuestion()])
    setSubmitError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const updateQuestion = (id: string, patch: Partial<Omit<ModalQuestion, 'id' | 'options'>>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
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

  const addQuestion = () => setQuestions((prev) => [...prev, newQuestion()])

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.id !== questionId)))
  }

  const handleCreatePoll = async () => {
    setSubmitError(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setSubmitError('Please enter a poll title.')
      return
    }
    if (!settings.expiry) {
      setSubmitError('Please choose an expiry date and time.')
      return
    }
    const expiresAt = new Date(settings.expiry)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      setSubmitError('Please choose a valid future expiry date and time.')
      return
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        setSubmitError('Each question needs text.')
        return
      }
      const filled = q.options.map((o) => o.trim()).filter(Boolean)
      if (filled.length < 2) {
        setSubmitError('Each question needs at least two non-empty options.')
        return
      }
    }

    const body = {
      title: trimmedTitle,
      responseMode: settings.isAnonymous ? ('ANONYMOUS' as const) : ('AUTHENTICATED' as const),
      expiresAt: expiresAt.toISOString(),
      questions: questions.map((q) => ({
        text: q.text.trim(),
        isMandatory: q.isMandatory,
        options: q.options.map((t) => ({ text: t.trim() })).filter((o) => o.text.length > 0)
      }))
    }

    setIsSubmitting(true)
    try {
      const data = await parseJsonResponse<{ pollId: string }>(
        await apiFetch('/polls', { method: 'POST', body: JSON.stringify(body) })
      )
      resetForm()
      onPollCreated(data.pollId)
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not create poll')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-poll-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="create-poll-modal-title" className="text-xl font-bold tracking-tight text-slate-900">
            Create a New Poll
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreatePoll()}
              disabled={isSubmitting}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Creating...
                </>
              ) : (
                'Create Poll'
              )}
            </button>
          </div>
        </header>

        <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto px-6 py-6">
          {submitError && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}

          <section className="mb-8">
            <label htmlFor="modal-poll-title" className="sr-only">
              Poll title
            </label>
            <input
              id="modal-poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Poll title"
              className="w-full border-0 border-b border-slate-200 bg-transparent py-3 text-2xl font-semibold tracking-tight text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-0"
            />
            <p className="mt-2 text-sm text-slate-500">Give your poll a clear, compelling title.</p>
          </section>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <section
                key={question.id}
                className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Question {qIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length <= 1}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                    title="Delete question"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </button>
                </div>

                <input
                  type="text"
                  value={question.text}
                  onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                  placeholder="Question text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F8FAFC] px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">Mark as mandatory</span>
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
                      className={`pointer-events-none inline-block size-7 rounded-full bg-white shadow transition duration-200 ease-out ${
                        question.isMandatory ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Options</p>
                  <ul className="mt-2 space-y-2">
                    {question.options.map((opt, oIndex) => (
                      <li key={`${question.id}-opt-${oIndex}`} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(question.id, oIndex)}
                          disabled={question.options.length <= 2}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:pointer-events-none disabled:opacity-25"
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
                    className="mt-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
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
            className="mt-6 flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-3.5 text-sm font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-700"
          >
            <Plus className="mr-2 size-4" aria-hidden />
            Add Another Question
          </button>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Settings</h3>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Anonymous voting</p>
                <p className="text-sm text-slate-500">Hide identities vs. require login</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.isAnonymous}
                onClick={() => setSettings((s) => ({ ...s, isAnonymous: !s.isAnonymous }))}
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
            <div className="mt-6">
              <label htmlFor="modal-expiry" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Expiry date &amp; time
              </label>
              <input
                id="modal-expiry"
                type="datetime-local"
                value={settings.expiry}
                onChange={(e) => setSettings((s) => ({ ...s, expiry: e.target.value }))}
                className="mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
