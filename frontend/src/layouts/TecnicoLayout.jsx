import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './TecnicoLayout.css'

const NAV = [
  {
    section: 'Principal',
    items: [
      { to: '/tecnico/dashboard',     label: 'Dashboard',          icon: <IcoDash /> },
    ]
  },
  {
    section: 'Inspecciones',
    items: [
      { to: '/tecnico/inspecciones',  label: 'Mis Inspecciones',   icon: <IcoClip /> },
    ]
  },
]

export default function TecnicoLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const handleEscape = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const ini = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'TC'

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="tl-root">
      <div className="tl-main tl-main--full">
        <header className="tl-topbar" ref={menuRef}>
          <button
            className="tl-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <IcoMenu />
          </button>
          <div className="tl-topbar__title">
            <h3>Panel del Asistente Técnico</h3>
            <p>Gestión de inspecciones fitosanitarias asignadas</p>
          </div>
          <div className="tl-topbar__actions">
            <span className="tl-topbar__date"><IcoCal /> {hoy}</span>
            <div className="tl-topbar__avatar">{ini}</div>
          </div>

          {menuOpen && (
            <div className="tl-dropdown" role="menu">
              <div className="tl-brand">
                <div className="tl-brand__icon"><IcoLeaf /></div>
                <div>
                  <div className="tl-brand__name">SIGFITO</div>
                  <div className="tl-brand__sub">Sistema Fitosanitario</div>
                </div>
              </div>

              <div className="tl-user-row">
                <div className="tl-avatar">{ini}</div>
                <div>
                  <div className="tl-user__name">{user?.nombre || 'Técnico'}</div>
                  <div className="tl-user__role">Asistente Técnico</div>
                </div>
              </div>

              <nav className="tl-nav">
                {NAV.map(g => (
                  <div key={g.section}>
                    <div className="tl-nav__section">{g.section}</div>
                    {g.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `tl-nav__item${isActive ? ' tl-nav__item--active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="tl-nav__icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>

              <div className="tl-sidebar__footer">
                <button className="tl-logout" onClick={handleLogout}>
                  <IcoLogout /> Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="tl-page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
function IcoDash()   { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function IcoClip()   { return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IcoLeaf()   { return <svg viewBox="0 0 24 24" {...S}><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg> }
function IcoLogout() { return <svg viewBox="0 0 24 24" {...S}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function IcoCal()    { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IcoMenu()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> }
