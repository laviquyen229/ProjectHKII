import { api } from '../api'
import StudentPicker, { useStudentChoice } from '../components/StudentPicker'
import { ATTENDANCE, Badge, ErrorBox, Loading, PageTitle, fmtDate, percent, useAsync } from '../components/ui'
import { EmptyRow } from '../components/ui'

export default function Attendance() {
  const { list, studentId, setPicked, loading: pl } = useStudentChoice()
  const { data, error, loading } = useAsync(async () => {
    if (!studentId) return null
    const [summary, rows, classes] = await Promise.all([
      api.get(`/attendance/summary/${studentId}`),
      api.get(`/attendance?student_id=${studentId}`),
      api.get('/classes'),
    ])
    return { summary, rows, classes }
  }, [studentId])

  if (pl || loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data) return <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>

  const { summary, rows, classes } = data
  const className = (id) => classes.find((c) => c.id === id)?.code || `#${id}`

  return (
    <>
      <PageTitle title="Chuyên cần" subtitle="Lịch sử điểm danh theo từng buổi học.">
        <StudentPicker list={list} value={studentId} onChange={setPicked} />
      </PageTitle>
      <div className="mb-5 flex flex-wrap gap-3">
        <Badge tone="blue">Tỷ lệ: {percent(summary.attendance_rate)}</Badge>
        <Badge tone="green">Có mặt {summary.present}</Badge>
        <Badge tone="amber">Trễ {summary.late}</Badge>
        <Badge tone="red">Vắng {summary.absent}</Badge>
        <Badge tone="gray">Có phép {summary.excused}</Badge>
      </div>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Ngày</th>
              <th className="th">Lớp</th>
              <th className="th">Trạng thái</th>
              <th className="th">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="td">{fmtDate(a.date)}</td>
                <td className="td">{className(a.class_id)}</td>
                <td className="td">
                  <Badge tone={ATTENDANCE[a.status].tone}>{ATTENDANCE[a.status].label}</Badge>
                </td>
                <td className="td text-slate-500">{a.note || ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <EmptyRow cols={4}>Chưa có buổi học nào được ghi nhận.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
