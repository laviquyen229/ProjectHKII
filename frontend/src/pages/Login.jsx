import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CalendarCheck, Sparkles, Wallet } from 'lucide-react'
import { useAuth } from '../auth'
import { ErrorBox, Field } from '../components/ui'

const FEATURES = [
  [CalendarCheck, 'Điểm danh và điểm số', 'Ghi nhận từng buổi học, tổng hợp chuyên cần và điểm trung bình.'],
  [Wallet, 'Học phí rõ ràng', 'Theo dõi khoản đã đóng, chưa đóng và quá hạn.'],
  [Sparkles, 'AI Coach', 'Nhận xét bài viết, bài nói tiếng Anh ngay trong hệ thống.'],
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold ring-1 ring-white/30">
            H
          </div>
          <span className="text-xl font-bold">HKII</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Quản lý trung tâm gọn gàng, rõ ràng.</h2>
          <ul className="mt-10 space-y-6">
            {FEATURES.map(([Icon, title, desc]) => (
              <li key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-indigo-100">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-sm text-indigo-100">FastAPI · PostgreSQL · Docker</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-extrabold text-white">
                H
              </div>
              <span className="text-lg font-bold text-slate-900">HKII</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Đăng nhập</h1>
            <p className="mt-1 text-sm text-slate-500">Nhập tài khoản do trung tâm cấp để tiếp tục.</p>
          </div>
          <ErrorBox message={error} />
          <Field label="Tên đăng nhập">
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label="Mật khẩu">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
