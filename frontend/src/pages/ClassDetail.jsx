import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, download } from '../api'
import { useAuth } from '../auth'
import {
  ATTENDANCE,
  Badge,
  ErrorBox,
  Field,
  Loading,
  Notice,
  PageTitle,
  percent,
  useAsync,
} from '../components/ui'
import { EmptyRow } from '../components/ui'
import { Avatar } from '../components/ui'

const today = () => new Date().toISOString().slice(0, 10)

const CHIP_ON = {
  green: 'border-emerald-500 bg-emerald-500 text-white',
  amber: 'border-amber-500 bg-amber-500 text-white',
  red: 'border-rose-500 bg-rose-500 text-white',
  blue: 'border-sky-500 bg-sky-500 text-white',
}

const NameCell = ({ name }) => (
  <div className="flex items-center gap-3">
    <Avatar name={name} size="sm" />
    <span className="whitespace-nowrap font-medium text-slate-900">{name}</span>
  </div>
)

// ---------- Tab: học viên ----------
function StudentsTab({ classId, students, reload }) {
  const { user } = useAuth()
  const all = useAsync(() => api.get('/students'), [])
  const [pick, setPick] = useState('')
  const [error, setError] = useState('')
  const enrolled = new Set(students.map((s) => s.id))
  const candidates = (all.data || []).filter((s) => !enrolled.has(s.id))

  const add = async (e) => {
    e.preventDefault()
    if (!pick) return
    setError('')
    try {
      await api.post(`/classes/${classId}/students`, { student_id: Number(pick) })
      setPick('')
      reload()
    } catch (err) {
      setError(err.message)
    }
  }
  const remove = async (id) => {
    setError('')
    try {
      await api.del(`/classes/${classId}/students/${id}`)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBox message={error} />
      {user.role === 'admin' && (
        <form onSubmit={add} className="card flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Field label="Thêm học viên vào lớp">
              <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">— Chọn học viên —</option>
                {candidates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.username})
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button className="btn-primary" disabled={!pick}>
            Thêm
          </button>
        </form>
      )}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Học viên</th>
              <th className="th">Tên đăng nhập</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="td"><NameCell name={s.full_name} /></td>
                <td className="td text-slate-500">{s.username}</td>
                <td className="td text-right">
                  {user.role === 'admin' && (
                    <button className="btn-ghost" onClick={() => remove(s.id)}>
                      Xóa khỏi lớp
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <EmptyRow cols={3}>Lớp chưa có học viên.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- Tab: điểm danh ----------
function AttendanceTab({ classId, students }) {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMsg('')
    api
      .get(`/attendance?class_id=${classId}&date_from=${date}&date_to=${date}`)
      .then((existing) => {
        if (cancelled) return
        const next = {}
        students.forEach((s) => {
          const found = existing.find((a) => a.student_id === s.id)
          next[s.id] = { status: found?.status || 'present', note: found?.note || '' }
        })
        setRows(next)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [classId, date, students])

  const update = (id, patch) => setRows({ ...rows, [id]: { ...rows[id], ...patch } })

  const save = async () => {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      await api.post('/attendance/batch', {
        class_id: Number(classId),
        date,
        records: students.map((s) => ({
          student_id: s.id,
          status: rows[s.id]?.status || 'present',
          note: rows[s.id]?.note || null,
        })),
      })
      setMsg('Đã lưu điểm danh.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (students.length === 0) return <p className="text-sm text-slate-500">Lớp chưa có học viên để điểm danh.</p>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Ngày học">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button
          className="btn-ghost"
          type="button"
          onClick={() =>
            setRows(Object.fromEntries(students.map((st) => [st.id, { status: 'present', note: rows[st.id]?.note || '' }])))
          }
        >
          Tất cả có mặt
        </button>
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu điểm danh'}
        </button>
      </div>
      <ErrorBox message={error} />
      <Notice message={msg} />
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Học viên</th>
              <th className="th">Trạng thái</th>
              <th className="th">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="td"><NameCell name={s.full_name} /></td>
                <td className="td">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Trạng thái của ${s.full_name}`}>
                    {Object.entries(ATTENDANCE).map(([value, { label, tone }]) => {
                      const on = (rows[s.id]?.status || 'present') === value
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => update(s.id, { status: value })}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            on ? CHIP_ON[tone] : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </td>
                <td className="td">
                  <input
                    className="input"
                    value={rows[s.id]?.note || ''}
                    maxLength={300}
                    onChange={(e) => update(s.id, { note: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- Tab: điểm số ----------
function ScoresTab({ classId, students }) {
  const scores = useAsync(() => api.get(`/scores?class_id=${classId}`), [classId])
  const [form, setForm] = useState({ student_id: '', kind: 'quiz', value: '', max_value: '10' })
  const [error, setError] = useState('')
  const name = (id) => students.find((s) => s.id === id)?.full_name || `#${id}`
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const add = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/scores', {
        class_id: Number(classId),
        student_id: Number(form.student_id),
        kind: form.kind.trim(),
        value: Number(form.value),
        max_value: Number(form.max_value),
      })
      setForm({ ...form, value: '' })
      scores.reload()
    } catch (err) {
      setError(err.message)
    }
  }
  const remove = async (id) => {
    setError('')
    try {
      await api.del(`/scores/${id}`)
      scores.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-5">
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
        <Field label="Loại điểm">
          <input className="input" value={form.kind} onChange={set('kind')} required />
        </Field>
        <Field label="Điểm">
          <input className="input" type="number" step="0.1" min="0" value={form.value} onChange={set('value')} required />
        </Field>
        <Field label="Tối đa">
          <input className="input" type="number" step="0.1" min="1" value={form.max_value} onChange={set('max_value')} required />
        </Field>
        <div className="flex items-end">
          <button className="btn-primary w-full">Thêm điểm</button>
        </div>
      </form>
      <ErrorBox message={error || scores.error} />
      {scores.loading ? (
        <Loading />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Học viên</th>
                <th className="th">Loại</th>
                <th className="th">Điểm</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(scores.data || []).map((s) => (
                <tr key={s.id}>
                  <td className="td"><NameCell name={name(s.student_id)} /></td>
                  <td className="td">{s.kind}</td>
                  <td className="td">
                    {s.value} / {s.max_value}
                  </td>
                  <td className="td text-right">
                    <button className="btn-ghost" onClick={() => remove(s.id)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {(scores.data || []).length === 0 && (
                <EmptyRow cols={4}>Chưa có điểm nào.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- Tab: báo cáo ----------
function ReportTab({ classId, code }) {
  const report = useAsync(() => api.get(`/reports/class/${classId}/summary`), [classId])
  const [error, setError] = useState('')

  const exportXlsx = async () => {
    setError('')
    try {
      await download(`/reports/class/${classId}/export.xlsx`, `bao-cao-lop-${code}.xlsx`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (report.loading) return <Loading />
  if (report.error) return <ErrorBox message={report.error} />
  const r = report.data
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Badge tone="blue">{r.student_count} học viên</Badge>
        <span className="text-sm text-slate-600">
          Chuyên cần TB: <b>{percent(r.average_attendance_rate)}</b>
        </span>
        <span className="text-sm text-slate-600">
          Điểm TB: <b>{r.average_score_10 ?? '—'}</b>
        </span>
        <button className="btn-ghost ml-auto" onClick={exportXlsx}>
          Xuất Excel
        </button>
      </div>
      <ErrorBox message={error} />
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Học viên</th>
              <th className="th">Số buổi</th>
              <th className="th">Có mặt</th>
              <th className="th">Trễ</th>
              <th className="th">Vắng</th>
              <th className="th">Có phép</th>
              <th className="th">Chuyên cần</th>
              <th className="th">Điểm TB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {r.students.map((s) => (
              <tr key={s.student_id}>
                <td className="td"><NameCell name={s.full_name} /></td>
                <td className="td">{s.sessions}</td>
                <td className="td">{s.present}</td>
                <td className="td">{s.late}</td>
                <td className="td">{s.absent}</td>
                <td className="td">{s.excused}</td>
                <td className="td">{percent(s.attendance_rate)}</td>
                <td className="td">{s.average_10 ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const TABS = [
  ['students', 'Học viên'],
  ['attendance', 'Điểm danh'],
  ['scores', 'Điểm số'],
  ['report', 'Báo cáo'],
]

export default function ClassDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState('students')
  const { data, error, loading, reload } = useAsync(async () => {
    const [classroom, students] = await Promise.all([
      api.get(`/classes/${id}`),
      api.get(`/classes/${id}/students`),
    ])
    return { classroom, students }
  }, [id])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const { classroom, students } = data

  return (
    <>
      <PageTitle title={classroom.name} subtitle={`${classroom.code} · ${classroom.schedule || 'Chưa có lịch học'}`} />
      <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'students' && <StudentsTab classId={id} students={students} reload={reload} />}
      {tab === 'attendance' && <AttendanceTab classId={id} students={students} />}
      {tab === 'scores' && <ScoresTab classId={id} students={students} />}
      {tab === 'report' && <ReportTab classId={id} code={classroom.code} />}
    </>
  )
}
