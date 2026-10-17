import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { ROLE_LABEL } from '../auth'
import { Badge, ErrorBox, Field, Loading, Notice, PageTitle, useAsync } from '../components/ui'
import { Avatar } from '../components/ui'

const EMPTY = { username: '', full_name: '', password: '', role: 'student' }
const ROLE_TONE = { admin: 'indigo', teacher: 'blue', student: 'green', parent: 'amber' }

export default function Users() {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const { data, error: loadError, loading, reload } = useAsync(() => {
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (q.trim()) params.set('q', q.trim())
    const qs = params.toString()
    return api.get(`/users${qs ? `?${qs}` : ''}`)
  }, [role, q])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const act = async (fn, okMessage) => {
    setError('')
    setMsg('')
    try {
      await fn()
      if (okMessage) setMsg(okMessage)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const create = (e) => {
    e.preventDefault()
    act(async () => {
      await api.post('/users', { ...form, username: form.username.trim(), full_name: form.full_name.trim() })
      setForm(EMPTY)
    }, 'Đã tạo tài khoản.')
  }

  return (
    <>
      <PageTitle title="Người dùng" subtitle="Tạo tài khoản, khóa hoặc mở khóa người dùng." />
      <form onSubmit={create} className="card mb-5 grid gap-3 sm:grid-cols-5">
        <Field label="Tên đăng nhập">
          <input className="input" value={form.username} onChange={set('username')} minLength={3} required />
        </Field>
        <Field label="Họ tên">
          <input className="input" value={form.full_name} onChange={set('full_name')} required />
        </Field>
        <Field label="Mật khẩu (≥ 8 ký tự)">
          <input className="input" type="password" value={form.password} onChange={set('password')} minLength={8} required />
        </Field>
        <Field label="Vai trò">
          <select className="input" value={form.role} onChange={set('role')}>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button className="btn-primary w-full">Tạo tài khoản</button>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input className="input !w-56" placeholder="Tìm theo tên…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ErrorBox message={error || loadError} />
        <Notice message={msg} />
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Họ tên</th>
                <th className="th">Tên đăng nhập</th>
                <th className="th">Vai trò</th>
                <th className="th">Trạng thái</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((u) => (
                <tr key={u.id}>
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={u.full_name} size="sm" /><span className="font-medium text-slate-900">{u.full_name}</span></div></td>
                  <td className="td text-slate-500">{u.username}</td>
                  <td className="td"><Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge></td>
                  <td className="td">
                    <Badge tone={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Hoạt động' : 'Đã khóa'}</Badge>
                  </td>
                  <td className="td text-right">
                    {u.id !== me.id && (
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          act(
                            () => api.patch(`/users/${u.id}`, { is_active: !u.is_active }),
                            u.is_active ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.',
                          )
                        }
                      >
                        {u.is_active ? 'Khóa' : 'Mở khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
