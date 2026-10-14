import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import StudentPicker, { useStudentChoice } from '../components/StudentPicker'
import { ErrorBox, Loading, PageTitle, money, percent, useAsync } from '../components/ui'

function Stat({ label, value, hint }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

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
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Stat label="Lớp học" value={classes.length} />
      <Stat label="Học viên" value={count('student')} hint={`${count('teacher')} giáo viên, ${count('parent')} phụ huynh`} />
      <Stat label="Học phí chưa đóng" value={money(tuition.unpaid)} hint={`${tuition.count_by_status.unpaid} khoản`} />
      <Stat label="Học phí quá hạn" value={money(tuition.overdue)} hint={`${tuition.count_by_status.overdue} khoản`} />
      <Stat label="Học phí đã thu" value={money(tuition.paid)} hint={`${tuition.count_by_status.paid} khoản`} />
    </div>
  )
}

function TeacherHome() {
  const { data, error, loading } = useAsync(() => api.get('/classes'), [])
  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((c) => (
        <Link key={c.id} to={`/classes/${c.id}`} className="card hover:border-indigo-300">
          <div className="text-xs font-semibold text-indigo-600">{c.code}</div>
          <div className="font-semibold text-slate-900">{c.name}</div>
          <div className="text-sm text-slate-500">{c.schedule || 'Chưa có lịch'}</div>
        </Link>
      ))}
      {data.length === 0 && <p className="text-sm text-slate-500">Bạn chưa phụ trách lớp nào.</p>}
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
  if (!data) return <p className="text-sm text-slate-500">Chưa có học viên nào được liên kết.</p>
  return (
    <>
      <div className="mb-4">
        <StudentPicker list={list} value={studentId} onChange={setPicked} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Chuyên cần" value={percent(data.att.attendance_rate)} hint={`${data.att.total} buổi đã ghi nhận`} />
        <Stat label="Điểm trung bình" value={data.avg === null ? '—' : data.avg.toFixed(2)} hint="Thang 10" />
        <Stat label="Học phí còn nợ" value={money(data.owed)} />
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <>
      <PageTitle title={`Xin chào, ${user.full_name}`} />
      {user.role === 'admin' && <AdminHome />}
      {user.role === 'teacher' && <TeacherHome />}
      {(user.role === 'student' || user.role === 'parent') && <FamilyHome />}
    </>
  )
}
