import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './TecnicoLayout.css'

const NAV = [
  {
    section: 'Principal',
    items: [
      { to: '/tecnico/dashboard', label: 'Inicio', icon: <IcoDash /> },
    ]
  },
  {
    section: 'Operaciones de Campo',
    items: [
      { to: '/tecnico/inspecciones', label: 'Inspecciones Asignadas', icon: <IcoClip /> },
      { to: '/tecnico/fincas',        label: 'Productores y Fincas',   icon: <IcoHome /> },
    ]
  },
  {
    section: 'Informes y Control',
    items: [
      { to: '/tecnico/informes', label: 'Historial de Informes', icon: <IcoFolder /> },
      { to: '/tecnico/alertas',  label: 'Alertas Fitosanitarias', icon: <IcoBell /> },
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
    : 'AT'

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="at-root">
      
      {/* BARRA DE NAVEGACIÓN SUPERIOR (FIJA) */}
      <header className="at-navbar" ref={menuRef}>
        <div className="at-navbar__brand">
          <div className="brand-logo-icon">
            <IcoLeaf />
          </div>
          <div className="brand-text">
            <span className="brand-name">SIGFITO</span>
            <span className="brand-badge">Asistente Técnico</span>
          </div>
        </div>

        <div className="at-navbar__actions">
          <span className="nav-date"><IcoCal /> {hoy}</span>
          
          <div className="nav-user-profile">
            <div className="user-avatar">{ini}</div>
            <div className="user-info">
              <span className="user-name">{user?.nombre || 'Técnico Invitado'}</span>
              <span className="user-role">Evaluador Oficial</span>
            </div>
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
          >
            <IcoMenu />
            <span className="mobile-menu-text">MENÚ</span>
          </button>
        </div>

        {/* MENÚ DESPLEGABLE */}
        {menuOpen && (
          <div className="at-dropdown-menu" role="menu">
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
      <main className="at-content-area">
        <Outlet />
      </main>

      {/* FOOTER CORPORATIVO (AZUL INSTITUCIONAL) */}
      <footer className="at-footer">
        <div className="footer-content">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <IcoLeaf /> <span className="f-logo-text">SIGFITO</span>
            </div>
            <p className="f-desc">
              Módulo del Asistente Técnico para la supervisión, registro técnico de plagas e inspección oficial fitosanitaria en campo.
            </p>
          </div>
          
          <div className="footer-links-col">
            <h5>Operaciones</h5>
            <a href="#">Inspecciones Pendientes</a>
            <a href="#">Censos de Plagas</a>
            <a href="#">Fincas Registradas</a>
          </div>
          
          <div className="footer-links-col">
            <h5>Soporte Legal</h5>
            <a href="#">Manual de Inspección ICA</a>
            <a href="#">Políticas del Sistema</a>
            <a href="#">Reportes Epidemiológicos</a>
          </div>
          
          <div className="footer-links-col">
            <h5>Contacto Directo</h5>
            <span className="contact-item"><IcoDash /> +57 601 123 4568</span>
            <span className="contact-item"><IcoClip /> tecnico@sigfito.gov.co</span>
            <span className="contact-item"><IcoMap /> Bucaramanga, Colombia</span>
          </div>
        </div>
        
        <div className="footer-copyright">
          <p>© {new Date().getFullYear()} SIGFITO Gobierno. Todos los derechos reservados.</p>
          <p>Creado por Miguel Buitrago, Johan Caro, Luis Álvarez y Julián Torres.</p>
        </div>
      </footer>

    </div>
  )
}

/* ÍCONOS SVG MINIMALISTAS */
const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
function IcoDash()   { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function IcoHome()   { return <svg viewBox="0 0 24 24" {...S}><path d="M3 12L12 3l9 9v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg> }
function IcoClip()   { return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IcoFolder() { return <svg viewBox="0 0 24 24" {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
function IcoLeaf()   { return <svg viewBox="0 0 24 24" {...S}><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg> }
function IcoLogout() { return <svg viewBox="0 0 24 24" {...S}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function IcoCal()    { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IcoMenu()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> }
function IcoBell()   { return <svg viewBox="0 0 24 24" {...S}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function IcoMap() { return <svg viewBox="0 0 24 24" {...S}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }