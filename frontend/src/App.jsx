import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import HomemakerDashboard from './pages/HomemakerDashboard'

const PrivateRoute = ({ children, role }) => {
  const user = JSON.parse(localStorage.getItem('healhome_user') || 'null')
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to="/login" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/patient" element={
          <PrivateRoute role="patient"><PatientDashboard /></PrivateRoute>
        } />
        <Route path="/homemaker" element={
          <PrivateRoute role="homemaker"><HomemakerDashboard /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}