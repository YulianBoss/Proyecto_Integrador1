import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLayout from './layouts/AdminLayout'
import AdminUsuarios from './pages/admin/AdminUsuarios'
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

function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <div style={{ marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:'1.35rem', fontWeight:700, color:'#1e293b' }}>Panel de Control</h2>
        <p style={{ fontSize:'0.82rem', color:'#6b7280', marginTop:'3px' }}>Bienvenido, {user?.nombre}.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'1rem' }}>
        {['Usuarios Activos','Lugares Registrados','Inspecciones 2026','Plagas Catalogadas'].map((label, i) => (
          <div key={label} style={{
            background:'#fff', borderRadius:'10px', border:'1px solid #e5e9f0',
            padding:'1.25rem', boxShadow:'0 1px 4px rgba(0,0,0,.06)'
          }}>
            <div style={{ fontSize:'1.8rem', fontWeight:800, color:['#2563a8','#2e7d52','#92400e','#5b21b6'][i] }}>—</div>
            <div style={{ fontSize:'0.78rem', color:'#6b7280', marginTop:'4px' }}>{label}</div>
          </div>
        ))}
      </div>
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
          <Route path="plagas"       element={<Placeholder titulo="Gestion de Plagas" />} />
          <Route path="cultivos"     element={<Placeholder titulo="Cultivos / Especies" />} />
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