import { NavLink, Outlet } from 'react-router-dom'
import {
  Bot,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  School,
  Users,
  Wallet,
} from 'lucide-react'
import { ROLE_LABEL, useAuth } from '../auth'
import { Avatar } from './ui'

const HOME = ['/', 'Tổng quan', LayoutDashboard]
const CLASSES = ['/classes', 'Lớp học', School]
const USERS = ['/users', 'Người dùng', Users]
const TUITION = ['/tuition', 'Học phí', Wallet]
const COACH = ['/coach', 'AI Coach', Bot]
const ATT = ['/attendance', 'Chuyên cần', CalendarCheck]
const GRADES = ['/grades', 'Điểm số', GraduationCap]

const NAV = {
  admin: [HOME, CLASSES, USERS, TUITION, COACH],
  teacher: [HOME, CLASSES, COACH],
  student: [HOME, ATT, GRADES, TUITION, COACH],
  parent: [HOME, ATT, GRADES, TUITION],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const items = NAV[user.role] || NAV.student

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-slate-900 text-slate-300 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="flex items-center gap-3 px-5 py-4 md:py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-extrabold text-white shadow-lg shadow-indigo-900/40">
            H
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-white">HKII</div>
            <div className="text-xs text-slate-400">Quản lý trung tâm</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0" aria-label="Điều hướng chính">
          {items.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-indigo-300' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-end gap-3 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
          <Avatar name={user.full_name} />
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-semibold text-slate-900">{user.full_name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</div>
          </div>
          <button className="btn-ghost btn-sm" onClick={logout} aria-label="Đăng xuất">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
