import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Inbox } from 'lucide-react'

// Tải dữ liệu bất đồng bộ: { data, error, loading, reload }
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }))
    return run()
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((e) => setState({ data: null, error: e.message || 'Có lỗi xảy ra.', loading: false }))
  }, [run])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}

// Khung chờ thay cho dòng chữ "Đang tải…"
export function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải">
      <div className="skeleton h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-48" />
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function Notice({ message }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700"
    >
      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function Badge({ tone = 'gray', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

// Dòng trống trong bảng
export function EmptyRow({ cols, children }) {
  return (
    <tr className="hover:!bg-transparent">
      <td colSpan={cols} className="px-4 py-12 text-center">
        <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        <span className="text-sm text-slate-500">{children}</span>
      </td>
    </tr>
  )
}

const STAT_TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600',
}

export function StatCard({ icon: Icon, tone = 'indigo', label, value, hint }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${STAT_TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  )
}

// Vòng tròn phần trăm (value từ 0 đến 1)
export function Ring({ value, color = '#4f46e5', label, caption, display }) {
  const r = 44
  const c = 2 * Math.PI * r
  const v = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value))
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
        />
      </svg>
      <div>
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-3xl font-bold tracking-tight text-slate-900">
          {display ?? (value === null || value === undefined ? '—' : `${Math.round(v * 100)}%`)}
        </div>
        {caption && <div className="mt-0.5 text-xs text-slate-500">{caption}</div>}
      </div>
    </div>
  )
}

export function Avatar({ name, size = 'md' }) {
  const parts = (name || '?').trim().split(/\s+/)
  const initials = (parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase()
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white ${sizes[size]}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export const ATTENDANCE = {
  present: { label: 'Có mặt', tone: 'green' },
  late: { label: 'Đi trễ', tone: 'amber' },
  absent: { label: 'Vắng', tone: 'red' },
  excused: { label: 'Vắng có phép', tone: 'blue' },
}

export const TUITION = {
  unpaid: { label: 'Chưa đóng', tone: 'amber' },
  paid: { label: 'Đã đóng', tone: 'green' },
  overdue: { label: 'Quá hạn', tone: 'red' },
}

export const money = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫'
export const percent = (r) => (r === null || r === undefined ? '—' : `${(r * 100).toFixed(0)}%`)
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—')
