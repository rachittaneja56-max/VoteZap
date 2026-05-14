import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { apiFetch, parseJsonResponse, ApiError } from '../lib/api'
import type { Poll, PollQuestion, PublishedResult } from '../types/poll'

type LoadState = 'loading' | 'ready' | 'error'

function PublishedResultsView({ result }: { result: PublishedResult }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="border-b border-slate-100 pb-5">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Published results</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{result.title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {result.totalResponses.toLocaleString()} total response{result.totalResponses === 1 ? '' : 's'}
            {result.publishedAt
              ? ` · Published ${new Date(result.publishedAt).toLocaleDateString()}`
              : ''}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {result.results.map((q) => {
            return (
              <div key={q.questionId} className="rounded-xl border border-slate-200 p-4">
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  {q.questionText}
                </h2>
                <ul className="mt-4 space-y-3">
                  {q.options.map((option) => (
                    <li key={option.optionId}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-slate-700">{option.optionText}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {option.voteCount} ({option.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.min(100, option.percentage)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back home
        </Link>
      </div>
    </div>
  )
}

export default function Vote() {
  const { pollId } = useParams<{ pollId: string }>()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [poll, setPoll] = useState<Poll | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>()
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitDone, setSubmitDone] = useState(false)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [publishedResult, setPublishedResult] = useState<PublishedResult | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (!pollId) {
        setLoadState('error')
        setErrorMessage('Invalid poll link.')
        return
      }
      void (async () => {
        setLoadState('loading')
        setErrorMessage(null)
        setErrorCode(undefined)
        try {
        const data = await parseJsonResponse<{ poll: Poll }>(
          await apiFetch(`/polls/${pollId}`, { method: 'GET' })
        )
        if (cancelled) return
        setPoll(data.poll)
        if (data.poll.isPublished) {
          const result = await parseJsonResponse<PublishedResult>(
            await apiFetch(`/polls/${pollId}/results`, { method: 'GET' })
          )
          if (cancelled) return
          setPublishedResult(result)
        } else {
          setPublishedResult(null)
        }
        setLoadedAt(Date.now())
        setLoadState('ready')
        } catch (e) {
          if (cancelled) return
          const code = e instanceof ApiError ? e.code : undefined
          setErrorCode(code)
          setErrorMessage(e instanceof Error ? e.message : 'Could not load poll')
          setLoadState('error')
        }
      })()
    })

    return () => {
      cancelled = true
    }
  }, [pollId])

  const isExpired = useMemo(() => {
    if (!poll?.expiresAt || loadedAt === null) return false
    return new Date(poll.expiresAt).getTime() <= loadedAt
  }, [poll, loadedAt])

  const isClosed = Boolean(poll?.isPublished)

  const mandatoryOk = useMemo(() => {
    if (!poll?.questions) return false
    for (const q of poll.questions) {
      if (!q.isMandatory) continue
      const sid = q._id
      if (!selections[sid]) return false
    }
    return true
  }, [poll, selections])

  const handleSelect = (questionId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: optionId }))
    setSubmitError(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pollId || !poll) return
    if (isExpired || isClosed) return

    for (const q of poll.questions) {
      if (q.isMandatory && !selections[q._id]) {
        setSubmitError('Please answer all mandatory questions.')
        return
      }
    }

    const answers = poll.questions
      .map((q: PollQuestion) => ({
        questionId: q._id,
        selectedOptionId: selections[q._id]
      }))
      .filter((a) => Boolean(a.selectedOptionId))

    if (!answers.length) {
      setSubmitError('Select at least one option before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await parseJsonResponse(
        await apiFetch(`/responses/${pollId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers })
        })
      )
      setSubmitDone(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-10 py-12 shadow-sm">
          <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
          <p className="text-sm font-medium text-slate-500">Loading poll...</p>
        </div>
      </div>
    )
  }

  if (loadState === 'error' || !poll) {
    const loginRequired = errorCode === 'LOGIN_REQUIRED' || errorCode === 'UNAUTHORIZED'
    const isPollExpired =
      errorMessage?.toLowerCase().includes('expired') || errorMessage?.toLowerCase().includes('closed')

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {loginRequired ? 'Login required' : isPollExpired ? 'Poll unavailable' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{errorMessage}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {loginRequired && (
              <Link
                to="/login"
                className="inline-flex justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/"
              className="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (submitDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Thanks for voting!</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Your response has been recorded.</p>
          <Link
            to="/"
            className="mt-6 inline-flex justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Back home
          </Link>
        </div>
      </div>
    )
  }

  if (isClosed) {
    if (publishedResult) {
      return <PublishedResultsView result={publishedResult} />
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Voting closed</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Results for this poll have been published; new responses are not accepted.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back home
          </Link>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Poll expired</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            This poll is no longer accepting responses.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{poll.title}</h1>
          {poll.description && (
            <p className="mt-2 text-sm font-medium text-slate-500">{poll.description}</p>
          )}
          <p className="mt-1 text-xs font-medium text-slate-500">
            {poll.responseMode === 'AUTHENTICATED' ? 'Sign-in may be required to submit.' : 'Anonymous voting'}
          </p>

          <div className="mt-8 space-y-8">
            {poll.questions.map((question) => (
              <fieldset key={question._id} className="border-0 p-0">
                <legend className="text-sm font-semibold tracking-tight text-slate-900">
                  {question.text}
                  {question.isMandatory && <span className="text-red-500"> *</span>}
                </legend>
                <ul className="mt-3 space-y-2">
                  {question.options.map((opt) => {
                    const checked = selections[question._id] === opt._id
                    return (
                      <li key={opt._id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            checked
                              ? 'border-blue-500 bg-blue-50/60 text-blue-900'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            className="size-4 border-slate-300 text-blue-600 focus:ring-blue-500/30"
                            name={`question-${question._id}`}
                            value={opt._id}
                            checked={checked}
                            onChange={() => handleSelect(question._id, opt._id)}
                          />
                          <span>{opt.text}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            ))}
          </div>

          {submitError && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}

          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting || !mandatoryOk}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Submitting...
                </>
              ) : (
                'Submit vote'
              )}
            </button>
            {!mandatoryOk && (
              <p className="mt-2 text-center text-xs font-medium text-slate-500">
                Answer all mandatory questions to enable submit.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
