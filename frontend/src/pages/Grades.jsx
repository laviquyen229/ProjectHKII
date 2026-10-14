import { api } from '../api'
import StudentPicker, { useStudentChoice } from '../components/StudentPicker'
import { ErrorBox, Loading, PageTitle, useAsync } from '../components/ui'

export default function Grades() {
  const { list, studentId, setPicked, loading: pl } = useStudentChoice()
  const { data, error, loading } = useAsync(async () => {
    if (!studentId) return null
    const [summary, scores, classes] = await Promise.all([
      api.get(`/scores/student/${studentId}/summary`),
      api.get(`/scores?student_id=${studentId}`),
      api.get('/classes'),
    ])
    return { summary, scores, classes }
  }, [studentId])

  if (pl || loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data) return <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>

  const { summary, scores, classes } = data
  const className = (id) => classes.find((c) => c.id === id)?.code || `#${id}`

  return (
    <>
      <PageTitle title="Điểm số">
        <StudentPicker list={list} value={studentId} onChange={setPicked} />
      </PageTitle>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {summary.map((s) => (
          <div key={s.class_id} className="card">
            <div className="text-xs font-semibold text-indigo-600">{className(s.class_id)}</div>
            <div className="text-2xl font-bold">{s.average_10.toFixed(2)}</div>
            <div className="text-xs text-slate-500">Điểm TB thang 10 · {s.count} đầu điểm</div>
          </div>
        ))}
        {summary.length === 0 && <p className="text-sm text-slate-500">Chưa có điểm.</p>}
      </div>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="th">Lớp</th>
              <th className="th">Loại</th>
              <th className="th">Điểm</th>
              <th className="th">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scores.map((s) => (
              <tr key={s.id}>
                <td className="td">{className(s.class_id)}</td>
                <td className="td">{s.kind}</td>
                <td className="td font-semibold">
                  {s.value} / {s.max_value}
                </td>
                <td className="td text-slate-500">{s.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
