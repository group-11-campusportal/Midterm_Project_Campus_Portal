import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FormPage from './pages/FormPage'
import FormOutput from './pages/FormOutput'
import NotFound from './pages/NotFound'

function App() {
  const [currentUser, setCurrentUser] = useState(null)

  function handleLogin(user) { setCurrentUser(user) }
  function handleLogout() { setCurrentUser(null) }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          element={
            <ProtectedRoute user={currentUser}>
              <MainLayout user={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard user={currentUser} />} />
          <Route path="/form" element={<FormPage user={currentUser} />} />
          <Route path="/output" element={<FormOutput user={currentUser} />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  )
}

export default App
