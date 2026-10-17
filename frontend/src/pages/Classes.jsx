import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Field, Loading, PageTitle, useAsync } from '../components/ui'
import { EmptyRow } from '../components/ui'

function CreateClass({ teachers, onCreated }) {
  const [form, setForm] = useState({ code: '', name: '', schedule: '', teacher_id: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/classes', {
        code: form.code.trim(),
        name: form.name.trim(),
        schedule: form.schedule.trim() || null,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      })
      setForm({ code: '', name: '', schedule: '', teacher_id: '' })
      onCreated()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} className="card mb-5 grid gap-3 sm:grid-cols-5">
      <Field label="Mã lớp">
        <input className="input" value={form.code} onChange={set('code')} required />
      </Field>
      <Field label="Tên lớp">
        <input className="input" value={form.name} onChange={set('name')} required />
      </Field>
      <Field label="Lịch học">
        <input className="input" value={form.schedule} onChange={set('schedule')} />
      </Field>
      <Field label="Giáo viên">
        <select className="input" value={form.teacher_id} onChange={set('teacher_id')}>
          <option value="">— Chưa gán —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end">
        <button className="btn-primary w-full">Tạo lớp</button>
      </div>
      {error && (
        <div className="sm:col-span-5">
          <ErrorBox message={error} />
        </div>
      )}
    </form>
  )
}

export default function Classes() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const { data, error, loading, reload } = useAsync(async () => {
    const [classes, teachers] = await Promise.all([
      api.get('/classes'),
      isAdmin ? api.get('/users?role=teacher') : Promise.resolve([]),
    ])
    return { classes, teachers }
  }, [isAdmin])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const teacherName = (id) => data.teachers.find((t) => t.id === id)?.full_name || '—'

  return (
    <>
      <PageTitle title="Lớp học" subtitle="Danh sách lớp, giáo viên phụ trách và lịch học." />
      {isAdmin && <CreateClass teachers={data.teachers} onCreated={reload} />}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Mã</th>
              <th className="th">Tên lớp</th>
              <th className="th">Lịch học</th>
              {isAdmin && <th className="th">Giáo viên</th>}
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.classes.map((c) => (
              <tr key={c.id}>
                <td className="td"><span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{c.code}</span></td>
                <td className="td font-medium text-slate-900">{c.name}</td>
                <td className="td text-slate-500">{c.schedule || '—'}</td>
                {isAdmin && <td className="td">{teacherName(c.teacher_id)}</td>}
                <td className="td text-right">
                  <Link className="btn-ghost" to={`/classes/${c.id}`}>
                    Mở lớp
                  </Link>
                </td>
              </tr>
            ))}
            {data.classes.length === 0 && (
              <EmptyRow cols={5}>Chưa có lớp nào.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
