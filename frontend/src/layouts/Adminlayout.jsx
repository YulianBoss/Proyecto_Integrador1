import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminLayout.css'

const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
    ]
  },
  {
    section: 'Gestión de Usuarios',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios y Solicitudes', icon: <IconUsers /> },
    ]
  },
  {
    section: 'Catálogos',
    items: [
      { to: '/admin/plagas',    label: 'Plagas',    icon: <IconPlaga /> },
      { to: '/admin/cultivos',  label: 'Cultivos',  icon: <IconCultivo /> },
    ]
  },
  {
    section: 'Supervisión',
    items: [
      { to: '/admin/inspecciones', label: 'Inspecciones', icon: <IconInspeccion /> },
      { to: '/admin/reportes',     label: 'Reportes',     icon: <IconReporte /> },
    ]
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutside = (event) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initiales = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
    : 'AD'

  const today = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })

  return (
    <div className="adm-root">
      <div className="adm-main adm-main--full">
        <header className="adm-topbar" ref={menuRef}>
          <button
            className="adm-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <IconMenu />
          </button>

          <div className="adm-topbar__title">
            <h3>Panel Administrativo</h3>
            <p>Gestión global del sistema fitosanitario</p>
          </div>

          <div className="adm-topbar__actions">
            <span className="adm-topbar__date">
              <IconCalendar /> {today}
            </span>
            <div className="adm-topbar__avatar">{initiales}</div>
          </div>

          {menuOpen && (
            <div className="adm-dropdown" role="menu">
              <div className="adm-brand">
                <div className="adm-brand__icon">
                  <IconSettings />
                </div>
                <div>
                  <div className="adm-brand__name">SIGFITO</div>
                  <div className="adm-brand__sub">Panel Administrativo</div>
                </div>
              </div>

              <div className="adm-user-row">
                <div className="adm-avatar">{initiales}</div>
                <div>
                  <div className="adm-user-name">{user?.nombre || 'Administrador'}</div>
                  <div className="adm-user-role">Administrador ICA</div>
                </div>
              </div>

              <nav className="adm-nav">
                {NAV_ITEMS.map(group => (
                  <div key={group.section}>
                    <div className="adm-nav__section">{group.section}</div>
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `adm-nav__item ${isActive ? 'adm-nav__item--active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="adm-nav__icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>

              <div className="adm-sidebar__footer">
                <button className="adm-logout-btn" onClick={handleLogout}>
                  <IconLogout />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="adm-page">
          <Outlet />
        </main>
      </div>

      {menuOpen && (
        <div className="adm-overlay" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  )
}

/* ── SVG Icons ─────────────────────────────────────────────── */
function IconDashboard() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconPlaga() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function IconCultivo() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg>
}
function IconInspeccion() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
function IconReporte() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
function IconLogout() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function IconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function IconMenu() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}