import { Link } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

export default function SessionBadge() {
  const { status, user, isAuthenticated, logout } = useAuth()

  if (status === 'checking') {
    return <span className="text-xs font-medium text-slate-500">Checking session...</span>
  }

  if (!isAuthenticated || !user) {
    return (
      <Link
        to="/login"
        state={{ from: { pathname: '/dashboard' } }}
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
      >
        Login / Start Building
      </Link>
    )
  }

  return (
    <div className="group relative flex items-center">
      <div
        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-md transition-transform hover:scale-105"
        aria-label="User profile"
      >
        {user.email.charAt(0).toUpperCase()}
      </div>

      <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 origin-top-right translate-y-2 scale-95 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
          <div className="bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Logged in as</p>
            <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{user.email}</p>
          </div>
          <div className="p-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <UserCircle className="size-4 text-slate-400" />
              My Profile
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
