import { useState } from 'react'
import { api } from '../api'
import { Badge, ErrorBox, Field, Loading, PageTitle, useAsync } from '../components/ui'

export default function Coach() {
  const [kind, setKind] = useState('writing')
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const history = useAsync(() => api.get('/coach/history?limit=10'), [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setResult(await api.post('/coach/feedback', { kind, text }))
      history.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle title="AI Coach" />
      <form onSubmit={submit} className="card space-y-3">
        <Field label="Loại bài">
          <select className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="writing">Bài viết (Writing)</option>
            <option value="speaking">Bài nói (Speaking, dạng văn bản)</option>
          </select>
        </Field>
        <Field label="Nội dung (tối thiểu 20 ký tự)">
          <textarea
            className="input min-h-40"
            value={text}
            onChange={(e) => setText(e.target.value)}
            minLength={20}
            maxLength={4000}
            required
          />
        </Field>
        <ErrorBox message={error} />
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Đang chấm…' : 'Nhận xét'}
        </button>
      </form>

      {result && (
        <div className="card mt-5">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-semibold">Nhận xét</h2>
            <Badge tone={result.provider === 'gemini' ? 'blue' : 'gray'}>
              {result.provider === 'gemini' ? 'Gemini' : 'Theo luật'}
            </Badge>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{result.feedback}</pre>
        </div>
      )}

      <h2 className="mb-2 mt-8 font-semibold">Lịch sử gần đây</h2>
      {history.loading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {(history.data || []).map((h) => (
            <details key={h.id} className="card !p-3">
              <summary className="cursor-pointer text-sm">
                <span className="font-semibold">{h.kind === 'writing' ? 'Writing' : 'Speaking'}</span>{' '}
                <span className="text-slate-500">· {new Date(h.created_at).toLocaleString('vi-VN')}</span>
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-700">{h.feedback}</pre>
            </details>
          ))}
          {(history.data || []).length === 0 && <p className="text-sm text-slate-500">Chưa có lượt nào.</p>}
        </div>
      )}
    </>
  )
}
