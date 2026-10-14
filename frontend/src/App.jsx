import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import Attendance from './pages/Attendance'
import ClassDetail from './pages/ClassDetail'
import Classes from './pages/Classes'
import Coach from './pages/Coach'
import Dashboard from './pages/Dashboard'
import Grades from './pages/Grades'
import Login from './pages/Login'
import Tuition from './pages/Tuition'
import Users from './pages/Users'

function Protected({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="classes"
          element={
            <Protected roles={['admin', 'teacher']}>
              <Classes />
            </Protected>
          }
        />
        <Route
          path="classes/:id"
          element={
            <Protected roles={['admin', 'teacher']}>
              <ClassDetail />
            </Protected>
          }
        />
        <Route
          path="users"
          element={
            <Protected roles={['admin']}>
              <Users />
            </Protected>
          }
        />
        <Route
          path="attendance"
          element={
            <Protected roles={['student', 'parent']}>
              <Attendance />
            </Protected>
          }
        />
        <Route
          path="grades"
          element={
            <Protected roles={['student', 'parent']}>
              <Grades />
            </Protected>
          }
        />
        <Route
          path="tuition"
          element={
            <Protected roles={['admin', 'student', 'parent']}>
              <Tuition />
            </Protected>
          }
        />
        <Route
          path="coach"
          element={
            <Protected roles={['admin', 'teacher', 'student']}>
              <Coach />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
