import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import ProductorLayout from './layouts/ProductorLayout'
import TecnicoLayout from './layouts/TecnicoLayout'

// Páginas Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminPlagas from './pages/admin/AdminPlagas'
import AdminPlagasCrear from './pages/admin/AdminPlagasCrear'
import AdminPlagasEditar from './pages/admin/AdminPlagasEditar'
import AdminCultivosMock from './pages/admin/AdminCultivosMock'
import AdminInspecciones from './pages/admin/AdminInspecciones'

// Páginas Productor
import ProductorDashboard from './pages/productor/ProductorDashboard'
import LugaresList from './pages/productor/LugaresList'
import LotesPage from './pages/productor/LotesPage'
import SolicitarInspeccion from './pages/productor/SolicitarInspeccion'

// Páginas Técnico
import TecnicoDashboard from './pages/tecnico/TecnicoDashboard'
import TecnicoInspecciones from './pages/tecnico/TecnicoInspecciones'

// Estilos globales
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
      <strong>{titulo}</strong> — en construcción
    </div>
  )
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation() // ⚡ CORRECCIÓN CLAVE: Usar el hook de React Router
  
  if (loading) return null
  
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  
  if (roles && !roles.includes(user.rol)) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  
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
        <Route path="/"          element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login"     element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"  element={<PublicRoute><Register /></PublicRoute>} />

        {/* ── RUTAS DEL ADMINISTRADOR ── */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"    element={<AdminDashboard />} />
          <Route path="usuarios"     element={<AdminUsuarios />} />
          <Route path="solicitudes"  element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="plagas"       element={<AdminPlagas />} />
          <Route path="plagas/crear" element={<AdminPlagasCrear />} />
          <Route path="plagas/editar" element={<AdminPlagasEditar />} />
          <Route path="cultivos"     element={<AdminCultivosMock />} />
          <Route path="inspecciones" element={<AdminInspecciones />} />
          <Route path="reportes"     element={<Placeholder titulo="Reportes Globales" />} />
        </Route>

        {/* ── RUTAS DEL PRODUCTOR ── */}
        <Route path="/productor" element={<PrivateRoute roles={['productor']}><ProductorLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/productor/dashboard" replace />} />
          <Route path="dashboard" element={<ProductorDashboard />} />
          <Route path="lugares"   element={<LugaresList />} />
          <Route path="lotes"     element={<LotesPage />} />
          <Route path="solicitar" element={<SolicitarInspeccion />} />
          <Route path="historial" element={<SolicitarInspeccion />} />
        </Route>

        {/* ── RUTAS DEL TÉCNICO ── */}
        <Route path="/tecnico" element={<PrivateRoute roles={['tecnico']}><TecnicoLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/tecnico/dashboard" replace />} />
          <Route path="dashboard"    element={<TecnicoDashboard />} />
          <Route path="inspecciones" element={<TecnicoInspecciones />} />
        </Route>

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}