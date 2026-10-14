import { useCallback, useEffect, useState } from 'react'

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

export function Loading({ text = 'Đang tải…' }) {
  return <div className="py-10 text-center text-sm text-slate-500">{text}</div>
}

export function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div>
  )
}

export function Notice({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {message}
    </div>
  )
}

export function PageTitle({ title, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

const TONES = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-rose-100 text-rose-700',
  blue: 'bg-sky-100 text-sky-700',
  gray: 'bg-slate-100 text-slate-600',
}

export function Badge({ tone = 'gray', children }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
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
