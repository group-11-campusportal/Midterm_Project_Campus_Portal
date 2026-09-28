import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FormPage from './pages/FormPage'
import FormOutput from './pages/FormOutput'
import NotFound from './pages/NotFound'
import { courses as seedCourses } from './data/courses'
import { enrollments as seedEnrollments } from './data/enrollments'
import { grades as seedGrades } from './data/grades'
import { students } from './data/users'

// App owns the shared data. Pages read it through props and send changes
// back up through the handler props (one-way data flow + lifted state).
function App() {
  // The logged-in user lives in memory only; refreshing logs you out.
  const [currentUser, setCurrentUser] = useState(null)

  // Seeded from the hardcoded data files, then extended by the forms.
  const [courses] = useState(seedCourses)
  const [enrollments, setEnrollments] = useState(seedEnrollments)
  const [grades, setGrades] = useState(seedGrades)

  function handleLogin(user) {
    setCurrentUser(user)
  }

  function handleLogout() {
    setCurrentUser(null)
  }

  // Client form: a new enrollment request (always starts as "pending").
  function addEnrollment(enrollment) {
    setEnrollments((previous) => [...previous, enrollment])
  }

  // Administrator form: a newly recorded grade.
  function addGrade(grade) {
    setGrades((previous) => [...previous, grade])
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

        {/* Every inner page is nested in the shell and guarded by login. */}
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
              />
            }
          />
          <Route
            path="/form"
            element={
              <FormPage
                user={currentUser}
                courses={courses}
                enrollments={enrollments}
                grades={grades}
                students={students}
                onAddEnrollment={addEnrollment}
                onAddGrade={addGrade}
              />
            }
          />
          <Route
            path="/output"
            element={
              <FormOutput
                user={currentUser}
                enrollments={enrollments}
                grades={grades}
              />
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  )
}

export default App
