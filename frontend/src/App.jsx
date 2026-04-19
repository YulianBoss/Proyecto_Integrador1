import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminPlagasMock from './pages/admin/AdminPlagasMock'
import AdminCultivosMock from './pages/admin/AdminCultivosMock'
import ProductorLayout from './layouts/ProductorLayout'
import ProductorDashboard from './pages/productor/ProductorDashboard'
import LugaresList from './pages/productor/LugaresList'
import LotesPage from './pages/productor/LotesPage'
import SolicitarInspeccion from './pages/productor/SolicitarInspeccion'
import './layouts/AdminLayout.css'
import './layouts/ProductorLayout.css'

function Placeholder({ titulo }) {
  return (
    <div style={{
      background:'#fff', border:'1.5px dashed #e5e9f0',
      borderRadius:'10px', padding:'3rem', textAlign:'center',
      color:'#9ca3af', fontSize:'0.9rem'
    }}>
      <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem' }}>&#9881;</div>
      <strong>{titulo}</strong> — en construccion
    </div>
  )
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    if (user.rol === 'admin')     return <Navigate to="/admin/dashboard" replace />
    if (user.rol === 'productor') return <Navigate to="/productor/dashboard" replace />
    if (user.rol === 'tecnico')   return <Navigate to="/tecnico/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"    element={<AdminDashboard />} />
          <Route path="usuarios"     element={<AdminUsuarios />} />
          <Route path="solicitudes"  element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="plagas"       element={<AdminPlagasMock />} />
          <Route path="cultivos"     element={<AdminCultivosMock />} />
          <Route path="inspecciones" element={<Placeholder titulo="Supervision de Inspecciones" />} />
          <Route path="reportes"     element={<Placeholder titulo="Reportes Globales" />} />
        </Route>

        {/* Productor */}
        <Route path="/productor" element={<PrivateRoute roles={['productor']}><ProductorLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/productor/dashboard" replace />} />
          <Route path="dashboard" element={<ProductorDashboard />} />
          <Route path="lugares"   element={<LugaresList />} />
          <Route path="lotes"     element={<LotesPage />} />
          <Route path="solicitar" element={<SolicitarInspeccion />} />
          <Route path="historial" element={<SolicitarInspeccion />} />
        </Route>

        {/* Tecnico */}
        <Route path="/tecnico/*" element={
          <PrivateRoute roles={['tecnico']}><Placeholder titulo="Panel del Tecnico" /></PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}