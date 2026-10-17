import { Link } from 'react-router-dom'
import { Clock, GraduationCap, School, TriangleAlert, Users, Wallet, CircleCheck } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth'
import StudentPicker, { useStudentChoice } from '../components/StudentPicker'
import { ErrorBox, Loading, PageTitle, Ring, StatCard, money, useAsync } from '../components/ui'

const GREETING = {
  admin: 'Toàn cảnh hoạt động của trung tâm.',
  teacher: 'Các lớp bạn đang phụ trách.',
  student: 'Tình hình học tập của bạn.',
  parent: 'Tình hình học tập của con.',
}

const CLASS_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
]

function AdminHome() {
  const { data, error, loading } = useAsync(async () => {
    const [classes, users, tuition] = await Promise.all([
      api.get('/classes'),
      api.get('/users'),
      api.get('/tuition/summary'),
    ])
    return { classes, users, tuition }
  }, [])
  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const { classes, users, tuition } = data
  const count = (role) => users.filter((u) => u.role === role).length
  const total = tuition.paid + tuition.unpaid + tuition.overdue
  const pct = (v) => (total ? (v / total) * 100 : 0)
  const parts = [
    ['Đã thu', tuition.paid, 'bg-emerald-500', 'text-emerald-600'],
    ['Chưa đóng', tuition.unpaid, 'bg-amber-400', 'text-amber-600'],
    ['Quá hạn', tuition.overdue, 'bg-rose-500', 'text-rose-600'],
  ]
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={School} tone="indigo" label="Lớp học" value={classes.length} />
        <StatCard
          icon={Users}
          tone="sky"
          label="Học viên"
          value={count('student')}
          hint={`${count('teacher')} giáo viên · ${count('parent')} phụ huynh`}
        />
        <StatCard
          icon={Wallet}
          tone="amber"
          label="Học phí chưa đóng"
          value={money(tuition.unpaid)}
          hint={`${tuition.count_by_status.unpaid} khoản`}
        />
        <StatCard
          icon={TriangleAlert}
          tone="rose"
          label="Học phí quá hạn"
          value={money(tuition.overdue)}
          hint={`${tuition.count_by_status.overdue} khoản`}
        />
      </div>

      <div className="card mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Tình hình học phí</h2>
          <span className="text-sm text-slate-500">Tổng {money(total)}</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
          {parts.map(([label, value, bg]) => (
            <div key={label} className={bg} style={{ width: `${pct(value)}%` }} title={`${label}: ${money(value)}`} />
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {parts.map(([label, value, bg, text]) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${bg}`} />
              <div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className={`font-semibold ${text}`}>{money(value)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function TeacherHome() {
  const { data, error, loading } = useAsync(() => api.get('/classes'), [])
  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (data.length === 0) return <div className="card text-sm text-slate-500">Bạn chưa phụ trách lớp nào.</div>
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((c, i) => (
        <Link
          key={c.id}
          to={`/classes/${c.id}`}
          className="card group flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
        >
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white ${CLASS_COLORS[i % CLASS_COLORS.length]}`}
          >
            {c.code.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">{c.name}</div>
            <div className="text-xs font-medium text-slate-500">{c.code}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {c.schedule || 'Chưa có lịch'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function FamilyHome() {
  const { list, studentId, setPicked, loading: pl } = useStudentChoice()
  const { data, error, loading } = useAsync(async () => {
    if (!studentId) return null
    const [att, grades, tuition] = await Promise.all([
      api.get(`/attendance/summary/${studentId}`),
      api.get(`/scores/student/${studentId}/summary`),
      api.get(`/tuition?student_id=${studentId}`),
    ])
    const avg = grades.length ? grades.reduce((s, g) => s + g.average_10, 0) / grades.length : null
    const owed = tuition.filter((t) => t.status !== 'paid').reduce((s, t) => s + t.amount, 0)
    return { att, avg, owed }
  }, [studentId])

  if (pl || loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data) return <div className="card text-sm text-slate-500">Chưa có học viên nào được liên kết.</div>
  const { att, avg, owed } = data
  return (
    <>
      {list.length > 1 && (
        <div className="mb-4">
          <StudentPicker list={list} value={studentId} onChange={setPicked} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <Ring
            value={att.attendance_rate}
            color="#059669"
            label="Chuyên cần"
            caption={`${att.present + att.late}/${att.total - att.excused} buổi có mặt`}
          />
        </div>
        <div className="card">
          <Ring
            value={avg === null ? null : avg / 10}
            color="#4f46e5"
            label="Điểm trung bình"
            display={avg === null ? '—' : avg.toFixed(2)}
            caption={avg === null ? 'Chưa có điểm' : 'Trên thang 10'}
          />
        </div>
        <StatCard
          icon={owed > 0 ? Wallet : CircleCheck}
          tone={owed > 0 ? 'amber' : 'emerald'}
          label="Học phí còn nợ"
          value={money(owed)}
          hint={owed > 0 ? 'Vui lòng liên hệ trung tâm' : 'Không có khoản nào còn nợ'}
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Có mặt', att.present, 'text-emerald-600'],
          ['Đi trễ', att.late, 'text-amber-600'],
          ['Vắng', att.absent, 'text-rose-600'],
          ['Vắng có phép', att.excused, 'text-sky-600'],
        ].map(([label, value, color]) => (
          <div key={label} className="card flex items-center justify-between">
            <span className="text-sm text-slate-500">{label}</span>
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <GraduationCap className="h-4 w-4" />
        Tỷ lệ chuyên cần = (có mặt + đi trễ) / (tổng số buổi trừ buổi vắng có phép).
      </p>
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <>
      <PageTitle title={`Xin chào, ${user.full_name}`} subtitle={GREETING[user.role]} />
      {user.role === 'admin' && <AdminHome />}
      {user.role === 'teacher' && <TeacherHome />}
      {(user.role === 'student' || user.role === 'parent') && <FamilyHome />}
    </>
  )
}
