// Lớp gọi API duy nhất của giao diện. Thay cho Firebase SDK (onValue/push/update/httpsCallable).
const BASE = import.meta.env.VITE_API_BASE || '/api'
const TOKEN_KEY = 'hkii_token'

let token = ''
try {
  token = localStorage.getItem(TOKEN_KEY) || ''
} catch {
  token = ''
}

export function setToken(value) {
  token = value || ''
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* trình duyệt chặn storage: bỏ qua */
  }
}

export const hasToken = () => Boolean(token)

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function messageFrom(detail, fallback) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return 'Dữ liệu gửi lên không hợp lệ.'
  return fallback
}

async function request(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ.')
  }

  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    setToken('')
    window.dispatchEvent(new Event('hkii:logout'))
  }
  if (!res.ok) {
    let detail
    try {
      detail = (await res.json()).detail
    } catch {
      /* không có JSON */
    }
    throw new ApiError(res.status, messageFrom(detail, res.statusText || 'Có lỗi xảy ra.'))
  }
  if (raw) return res
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}

// Tải file cần header Authorization nên không dùng thẻ <a href> được.
export async function download(path, filename) {
  const res = await request(path, { raw: true })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
