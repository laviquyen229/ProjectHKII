import { useState } from 'react'
import { api } from '../api'
import { useAsync } from './ui'

// Học viên: chính mình. Phụ huynh: danh sách các con (API /students tự giới hạn theo vai trò).
export function useStudentChoice() {
  const students = useAsync(() => api.get('/students'), [])
  const [picked, setPicked] = useState(null)
  const list = students.data || []
  const studentId = picked ?? list[0]?.id ?? null
  return { list, studentId, setPicked, loading: students.loading, error: students.error }
}

export default function StudentPicker({ list, value, onChange }) {
  if (list.length <= 1) {
    return list[0] ? <span className="text-sm text-slate-600">{list[0].full_name}</span> : null
  }
  return (
    <select className="input !w-auto" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {s.full_name}
        </option>
      ))}
    </select>
  )
}
