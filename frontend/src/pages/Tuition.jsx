import { useState } from 'react'
import { api, download } from '../api'
import { useAuth } from '../auth'
import StudentPicker, { useStudentChoice } from '../components/StudentPicker'
import {
  Badge,
  ErrorBox,
  Field,
  Loading,
  Notice,
  PageTitle,
  TUITION,
  fmtDate,
  money,
  useAsync,
} from '../components/ui'
import { EmptyRow } from '../components/ui'
import { StatCard } from '../components/ui'
import { CircleCheck, TriangleAlert, Wallet } from 'lucide-react'

function Table({ rows, names, onPay }) {
  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full">
        <thead className="border-b border-slate-200">
          <tr>
            {names && <th className="th">Học viên</th>}
            <th className="th">Số tiền</th>
            <th className="th">Hạn đóng</th>
            <th className="th">Trạng thái</th>
            <th className="th">Ghi chú</th>
            {onPay && <th className="th" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((t) => (
            <tr key={t.id}>
              {names && <td className="td font-medium text-slate-900">{names(t.student_id)}</td>}
              <td className="td">{money(t.amount)}</td>
              <td className="td">{fmtDate(t.due_date)}</td>
              <td className="td">
                <Badge tone={TUITION[t.status].tone}>{TUITION[t.status].label}</Badge>
              </td>
              <td className="td text-slate-500">{t.note || ''}</td>
              {onPay && (
                <td className="td text-right">
                  {t.status !== 'paid' && (
                    <button className="btn-ghost" onClick={() => onPay(t.id)}>
                      Ghi nhận đã đóng
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <EmptyRow cols={6}>Không có khoản học phí nào.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  )
}

function AdminTuition() {
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ student_id: '', amount: '', due_date: '', note: '' })
  const [msg, setMsg] = useState('')
  const [actionError, setActionError] = useState('')
  const { data, error, loading, reload } = useAsync(async () => {
    const [rows, students, summary] = await Promise.all([
      api.get(`/tuition${status ? `?status=${status}` : ''}`),
      api.get('/students'),
      api.get('/tuition/summary'),
    ])
    return { rows, students, summary }
  }, [status])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const run = async (fn, okMessage) => {
    setMsg('')
    setActionError('')
    try {
      await fn()
      if (okMessage) setMsg(okMessage)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const create = (e) => {
    e.preventDefault()
    run(async () => {
      await api.post('/tuition', {
        student_id: Number(form.student_id),
        amount: Number(form.amount),
        due_date: form.due_date,
        note: form.note.trim() || null,
      })
      setForm({ student_id: '', amount: '', due_date: '', note: '' })
    }, 'Đã tạo khoản học phí.')
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const { rows, students, summary } = data
  const names = (id) => students.find((s) => s.id === id)?.full_name || `#${id}`

  return (
    <>
      <PageTitle title="Học phí" subtitle="Các khoản học phí và trạng thái thanh toán.">
        <button
          className="btn-ghost"
          onClick={() =>
            run(async () => {
              const r = await api.post('/tuition/mark-overdue')
              setMsg(`Đã đánh dấu quá hạn ${r.updated} khoản.`)
            })
          }
        >
          Đánh dấu quá hạn
        </button>
        <button
          className="btn-ghost"
          onClick={() => run(() => download('/reports/tuition/export.xlsx', 'bao-cao-hoc-phi.xlsx'))}
        >
          Xuất Excel
        </button>
      </PageTitle>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} tone="amber" label="Chưa đóng" value={money(summary.unpaid)} hint={`${summary.count_by_status.unpaid} khoản`} />
        <StatCard icon={TriangleAlert} tone="rose" label="Quá hạn" value={money(summary.overdue)} hint={`${summary.count_by_status.overdue} khoản`} />
        <StatCard icon={CircleCheck} tone="emerald" label="Đã thu" value={money(summary.paid)} hint={`${summary.count_by_status.paid} khoản`} />
      </div>

      <form onSubmit={create} className="card mb-5 grid gap-3 sm:grid-cols-5">
        <Field label="Học viên">
          <select className="input" value={form.student_id} onChange={set('student_id')} required>
            <option value="">— Chọn —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Số tiền (₫)">
          <input className="input" type="number" min="1000" step="1000" value={form.amount} onChange={set('amount')} required />
        </Field>
        <Field label="Hạn đóng">
          <input className="input" type="date" value={form.due_date} onChange={set('due_date')} required />
        </Field>
        <Field label="Ghi chú">
          <input className="input" value={form.note} onChange={set('note')} />
        </Field>
        <div className="flex items-end">
          <button className="btn-primary w-full">Tạo khoản</button>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(TUITION).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <ErrorBox message={actionError} />
        <Notice message={msg} />
      </div>
      <Table rows={rows} names={names} onPay={(id) => run(() => api.post(`/tuition/${id}/pay`), 'Đã ghi nhận thanh toán.')} />
    </>
  )
}

function FamilyTuition() {
  const { list, studentId, setPicked, loading: pl } = useStudentChoice()
  const { data, error, loading } = useAsync(
    () => (studentId ? api.get(`/tuition?student_id=${studentId}`) : Promise.resolve([])),
    [studentId],
  )
  if (pl || loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  return (
    <>
      <PageTitle title="Học phí" subtitle="Các khoản học phí và trạng thái thanh toán.">
        <StudentPicker list={list} value={studentId} onChange={setPicked} />
      </PageTitle>
      <Table rows={data} />
    </>
  )
}

export default function Tuition() {
  const { user } = useAuth()
  return user.role === 'admin' ? <AdminTuition /> : <FamilyTuition />
}
