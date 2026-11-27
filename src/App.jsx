import { useCallback, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FormPage from './pages/FormPage'
import FormOutput from './pages/FormOutput'
import AiAdvisor from './pages/AiAdvisor'
import Enrollments from './pages/Enrollments'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import { apiFetch, clearToken, getToken } from './lib/api'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authReady, setAuthReady] = useState(() => !getToken())
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [dataError, setDataError] = useState(null)

  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [grades, setGrades] = useState([])
  const [students, setStudents] = useState([])

  const handleLogout = useCallback(() => {
    clearToken()
    setCurrentUser(null)
    setCourses([])
    setEnrollments([])
    setGrades([])
    setStudents([])
    setDataError(null)
  }, [])

  // Listen for 401 responses from apiFetch and log out immediately
  useEffect(() => {
    window.addEventListener('auth:unauthorized', handleLogout)
    return () => window.removeEventListener('auth:unauthorized', handleLogout)
  }, [handleLogout])

  // Fetch all role-appropriate data from the API when logged in
  const loadPortalData = useCallback(async (user) => {
    if (!user) return
    setIsDataLoading(true)
    setDataError(null)
    try {
      const requests = [
        apiFetch('/api/courses'),
        apiFetch('/api/enrollments'),
        apiFetch('/api/grades'),
      ]
      if (user.role === 'administrator') {
        requests.push(apiFetch('/api/students'))
      }

      const [coursesRes, enrollmentsRes, gradesRes, studentsRes] =
        await Promise.all(requests)

      setCourses(coursesRes.data)
      setEnrollments(enrollmentsRes.data)
      setGrades(gradesRes.data)
      if (studentsRes) {
        setStudents(studentsRes.data)
      }
    } catch (error) {
      console.error('Failed to load portal data:', error)
      setDataError(
        error.message || 'Unable to connect to academic portal records. Check your internet connection and try again.',
      )
    } finally {
      setIsDataLoading(false)
    }
  }, [])

  // Restore session on page refresh if a token exists in localStorage
  useEffect(() => {
    if (!getToken()) return
    apiFetch('/api/auth/me')
      .then((res) => {
        setCurrentUser(res.user)
        return loadPortalData(res.user)
      })
      .catch(() => clearToken())
      .finally(() => setAuthReady(true))
  }, [loadPortalData])

  function handleLogin(user) {
    setCurrentUser(user)
    loadPortalData(user)
  }

  // B3: Student creates an enrollment via POST /api/enrollments
  async function addEnrollment(courseId) {
    const res = await apiFetch('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    })
    setEnrollments((previous) => [...previous, res.data])
    return res.data
  }

  // B4: Admin approves or rejects via PATCH /api/enrollments/:id/status
  async function updateEnrollmentStatus(enrollmentId, nextStatus) {
    const res = await apiFetch(`/api/enrollments/${enrollmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    })
    const updated = res.data

    setEnrollments((previous) =>
      previous.map((item) => (item.id === enrollmentId ? updated : item)),
    )

    // Refresh courses so the approved enrollment count stays accurate
    const coursesRes = await apiFetch('/api/courses')
    setCourses(coursesRes.data)
    return updated
  }

  // B3: Admin records a grade via POST /api/grades
  async function addGrade({ enrollmentId, score }) {
    const res = await apiFetch('/api/grades', {
      method: 'POST',
      body: JSON.stringify({ enrollmentId, score: Number(score) }),
    })
    setGrades((previous) => [...previous, res.data])
    return res.data
  }

  // Admin: change or delete a grade (PUT / DELETE /api/grades/:id).
  async function updateGrade(gradeId, score) {
    const res = await apiFetch(`/api/grades/${gradeId}`, {
      method: 'PUT',
      body: JSON.stringify({ score }),
    })
    setGrades((previous) => previous.map((item) => (item.id === gradeId ? res.data : item)))
    return res.data
  }

  async function deleteGrade(gradeId) {
    await apiFetch(`/api/grades/${gradeId}`, { method: 'DELETE' })
    setGrades((previous) => previous.filter((item) => item.id !== gradeId))
  }

  // Admin: manage course offerings (POST / PUT / DELETE /api/courses).
  const byCode = (a, b) => a.code.localeCompare(b.code) || a.term.localeCompare(b.term)
  async function createCourse(input) {
    const res = await apiFetch('/api/courses', { method: 'POST', body: JSON.stringify(input) })
    setCourses((previous) => [...previous, res.data].sort(byCode))
    return res.data
  }

  async function updateCourse(courseId, input) {
    const res = await apiFetch(`/api/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(input) })
    setCourses((previous) => previous.map((item) => (item.id === courseId ? res.data : item)).sort(byCode))
    return res.data
  }

  async function deleteCourse(courseId) {
    await apiFetch(`/api/courses/${courseId}`, { method: 'DELETE' })
    setCourses((previous) => previous.filter((item) => item.id !== courseId))
  }

  // Student: withdraw a pending request (DELETE /api/enrollments/:id; the server allows pending only).
  async function withdrawEnrollment(enrollmentId) {
    await apiFetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' })
    setEnrollments((previous) => previous.filter((item) => item.id !== enrollmentId))
  }

  if (!authReady) {
    return (
      <div className="content">
        <Spinner label="Restoring session…" />
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        <Route
          element={
            <ProtectedRoute user={currentUser}>
              <MainLayout user={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                user={currentUser}
                courses={courses}
                enrollments={enrollments}
                grades={grades}
                isLoading={isDataLoading}
                dataError={dataError}
                onRetry={() => loadPortalData(currentUser)}
                onCreateCourse={createCourse}
                onUpdateCourse={updateCourse}
                onDeleteCourse={deleteCourse}
              />
            }
          />
          <Route
            path="/enrollments"
            element={
              <ProtectedRoute user={currentUser} allowedRoles={['administrator']}>
                <Enrollments
                  enrollments={enrollments}
                  courses={courses}
                  onUpdateEnrollmentStatus={updateEnrollmentStatus}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/form"
            element={
              currentUser?.role === 'administrator' ? (
              <Navigate to="/output" replace />
            ) : (
              <FormPage
                user={currentUser}
                courses={courses}
                enrollments={enrollments}
                grades={grades}
                students={students}
                onAddEnrollment={addEnrollment}
                onAddGrade={addGrade}
                onWithdrawEnrollment={withdrawEnrollment}
              />
            )
            }
          />
          <Route
            path="/output"
            element={
              <FormOutput
                user={currentUser}
                enrollments={enrollments}
                grades={grades}
                students={students}
                onAddGrade={addGrade}
                onUpdateGrade={updateGrade}
                onDeleteGrade={deleteGrade}
                onWithdrawEnrollment={withdrawEnrollment}
              />
            }
          />
          <Route
            path="/profile"
            element={<Profile user={currentUser} enrollments={enrollments} grades={grades} />}
          />
          <Route
            path="/ai-advisor"
            element={
              <ProtectedRoute user={currentUser} allowedRoles={['administrator']}>
                <AiAdvisor courses={courses} />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  )
}

export default App
