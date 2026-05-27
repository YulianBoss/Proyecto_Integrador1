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
    section: 'Gestión Operativa',
    items: [
      { to: '/productor/lugares', label: 'Lugares de Producción', icon: <IcoHome /> },
      { to: '/productor/lotes',   label: 'Lotes Agrícolas',       icon: <IcoMap /> },
    ]
  },
  {
    section: 'Control Fitosanitario',
    items: [
      { to: '/productor/solicitar', label: 'Solicitar Inspección', icon: <IcoClip /> },
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
      
      {/* BARRA DE NAVEGACIÓN SUPERIOR (FIJA) */}
      <header className="pl-navbar" ref={menuRef}>
        <div className="pl-navbar__brand">
          <div className="brand-logo-icon">
            <IcoLeaf />
          </div>
          <div className="brand-text">
            <span className="brand-name">SIGFITO</span>
            <span className="brand-badge">Productor</span>
          </div>
        </div>

        <div className="pl-navbar__actions">
          <span className="nav-date"><IcoCal /> {hoy}</span>
          <button className="nav-icon-btn" aria-label="Notificaciones">
            <IcoBell />
            <span className="nav-badge-dot"></span>
          </button>
          
          <div className="nav-user-profile">
            <div className="user-avatar">{ini}</div>
            <div className="user-info">
              <span className="user-name">{user?.nombre || 'Productor Invitado'}</span>
              <span className="user-role">Cuenta Activa</span>
            </div>
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
          >
            <IcoMenu />
            <span style={{ fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.05em' }}>MENÚ</span>
          </button>
        </div>

        {/* MENÚ DESPLEGABLE (Móvil y Perfil) */}
        {menuOpen && (
          <div className="pl-dropdown-menu" role="menu">
            <nav className="dropdown-nav">
              {NAV.map(g => (
                <div key={g.section} className="dropdown-group">
                  <div className="dropdown-title">{g.section}</div>
                  {g.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="dropdown-icon">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="dropdown-footer">
              <button className="logout-btn" onClick={handleLogout}>
                <IcoLogout /> Cerrar sesión de forma segura
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="pl-content-area">
        <Outlet />
      </main>

      {/* FOOTER CORPORATIVO */}
      <footer className="pl-footer">
        <div className="footer-content">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <IcoLeaf /> <span className="f-logo-text">SIGFITO</span>
            </div>
            <p className="f-desc">
              Plataforma digital nacional para el control, trazabilidad y gestión fitosanitaria en la producción agrícola de Colombia.
            </p>
          </div>
          
          <div className="footer-links-col">
            <h5>Gestión</h5>
            <a href="#">Lugares de Producción</a>
            <a href="#">Lotes</a>
            <a href="#">Inspecciones</a>
          </div>
          
          <div className="footer-links-col">
            <h5>Soporte Legal</h5>
            <a href="#">Normativa ICA</a>
            <a href="#">Políticas de Privacidad</a>
            <a href="#">Términos de Uso</a>
          </div>
          
          <div className="footer-links-col">
            <h5>Contacto Directo</h5>
            <span className="contact-item"><IcoDash /> +57 601 123 4567</span>
            <span className="contact-item"><IcoClip /> soporte@sigfito.gov.co</span>
          </div>
        </div>
        
        <div className="footer-copyright">
          <p>© {new Date().getFullYear()} SIGFITO Gobierno. Todos los derechos reservados.</p>
          <p>Operando para el campo colombiano.</p>
        </div>
      </footer>

    </div>
  )
}

/* ==========================================================================
   ÍCONOS SVG (Minimalistas, sin dependencias externas)
   ========================================================================== */
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
function IcoBell()   { return <svg viewBox="0 0 24 24" {...S}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v0.68C7.64 5.36 6 7.92 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }