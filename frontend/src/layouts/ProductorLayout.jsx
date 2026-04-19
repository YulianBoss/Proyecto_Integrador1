import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProductorLayout.css'

const NAV = [
  {
    section: 'Principal',
    items: [
      { to: '/productor/dashboard', label: 'Dashboard', icon: <IcoDash /> },
    ]
  },
  {
    section: 'Gestion',
    items: [
      { to: '/productor/lugares', label: 'Lugares de Produccion', icon: <IcoHome /> },
      { to: '/productor/lotes',   label: 'Lotes',                 icon: <IcoMap /> },
    ]
  },
  {
    section: 'Inspecciones',
    items: [
      { to: '/productor/solicitar', label: 'Solicitar Inspeccion', icon: <IcoClip /> },
      { to: '/productor/historial', label: 'Historial',            icon: <IcoFolder /> },
    ]
  },
]

export default function ProductorLayout() {
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
    : 'PR'

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="pl-root">
      <div className="pl-main pl-main--full">
        <header className="pl-topbar" ref={menuRef}>
          <button
            className="pl-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <IcoMenu />
          </button>
          <div className="pl-topbar__title">
            <h3>Panel del Productor</h3>
            <p>Gestion fitosanitaria de sus lugares de produccion</p>
          </div>
          <div className="pl-topbar__actions">
            <span className="pl-topbar__date"><IcoCal /> {hoy}</span>
            <div className="pl-topbar__avatar">{ini}</div>
          </div>

          {menuOpen && (
            <div className="pl-dropdown" role="menu">
              <div className="pl-brand">
                <div className="pl-brand__icon"><IcoLeaf /></div>
                <div>
                  <div className="pl-brand__name">SIGFITO</div>
                  <div className="pl-brand__sub">Sistema Fitosanitario</div>
                </div>
              </div>

              <div className="pl-user-row">
                <div className="pl-avatar">{ini}</div>
                <div>
                  <div className="pl-user__name">{user?.nombre || 'Productor'}</div>
                  <div className="pl-user__role">Productor</div>
                </div>
              </div>

              <nav className="pl-nav">
                {NAV.map(g => (
                  <div key={g.section}>
                    <div className="pl-nav__section">{g.section}</div>
                    {g.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `pl-nav__item${isActive ? ' pl-nav__item--active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="pl-nav__icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>

              <div className="pl-sidebar__footer">
                <button className="pl-logout" onClick={handleLogout}>
                  <IcoLogout /> Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="pl-page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
function IcoDash()   { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function IcoHome()   { return <svg viewBox="0 0 24 24" {...S}><path d="M3 12L12 3l9 9v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg> }
function IcoMap()    { return <svg viewBox="0 0 24 24" {...S}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> }
function IcoClip()   { return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IcoFolder() { return <svg viewBox="0 0 24 24" {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
function IcoLeaf()   { return <svg viewBox="0 0 24 24" {...S}><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg> }
function IcoLogout() { return <svg viewBox="0 0 24 24" {...S}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function IcoCal()    { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IcoMenu()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> }