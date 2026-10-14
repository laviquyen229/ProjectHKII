import { NavLink, Outlet } from 'react-router-dom'
import { ROLE_LABEL, useAuth } from '../auth'

const NAV = {
  admin: [
    ['/', 'Tổng quan'],
    ['/classes', 'Lớp học'],
    ['/users', 'Người dùng'],
    ['/tuition', 'Học phí'],
    ['/coach', 'AI Coach'],
  ],
  teacher: [
    ['/', 'Tổng quan'],
    ['/classes', 'Lớp học'],
    ['/coach', 'AI Coach'],
  ],
  student: [
    ['/', 'Tổng quan'],
    ['/attendance', 'Chuyên cần'],
    ['/grades', 'Điểm số'],
    ['/tuition', 'Học phí'],
    ['/coach', 'AI Coach'],
  ],
  parent: [
    ['/', 'Tổng quan'],
    ['/attendance', 'Chuyên cần'],
    ['/grades', 'Điểm số'],
    ['/tuition', 'Học phí'],
  ],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const items = NAV[user.role] || NAV.student

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="px-5 py-4 text-lg font-extrabold text-indigo-700">HKII</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {items.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div className="text-right text-sm">
            <div className="font-semibold text-slate-800">{user.full_name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</div>
          </div>
          <button className="btn-ghost" onClick={logout}>
            Đăng xuất
          </button>
        </header>
        <main className="mx-auto max-w-5xl p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
