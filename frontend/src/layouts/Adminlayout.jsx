import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminLayout.css'

const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { to: '/admin/dashboard', label: 'Inicio', icon: <IconDashboard /> },
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
      { to: '/admin/plagas',    label: 'Plagas',   icon: <IconPlaga /> },
      { to: '/admin/cultivos',  label: 'Cultivos', icon: <IconCultivo /> },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  const menuRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen, userMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initiales = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
    : 'AD'

  const today = new Date().toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })

  return (
    <div className="adm-root">
      
      {/* --- BARRA SUPERIOR (NAVBAR) --- */}
      <header className="adm-topbar">
        <div className="adm-topbar__left">
          <div className="adm-brand-logo">
            <div className="adm-brand-icon">
              <IconLeafLogo />
            </div>
            <span className="adm-brand-text">SIGFITO</span>
          </div>
          <div className="adm-topbar__divider"></div>
          <span className="adm-topbar__title-text">Panel Administrativo</span>
        </div>

        <div className="adm-topbar__right">
          <div className="adm-date-badge">
            <IconCalendar /> {today}
          </div>
          
          {/* Menú de Usuario */}
          <div className="adm-user-dropdown-container" ref={userMenuRef}>
            <button 
              className="adm-user-trigger" 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
            >
              <div className="adm-avatar">{initiales}</div>
              <div className="adm-user-info">
                <span className="adm-user-name">{user?.nombre || 'Juan Perez'}</span>
                <span className="adm-user-role">Administrador</span>
              </div>
              <IconChevronDown />
            </button>

            {userMenuOpen && (
              <div className="adm-user-dropdown-menu">
                <button className="adm-dropdown-item" onClick={handleLogout}>
                  <IconLogout /> Cerrar sesión
                </button>
              </div>
            )}
          </div>

          <button
            className="adm-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
          >
            <IconMenu /> Menú
          </button>
        </div>
      </header>

      {/* --- MENÚ LATERAL (SIDEBAR) --- */}
      {menuOpen && (
        <div className="adm-sidebar" ref={menuRef} role="menu">
          <div className="adm-sidebar__header">
            <h3>Menú del Sistema</h3>
            <button className="adm-close-btn" onClick={() => setMenuOpen(false)}>
              <IconX />
            </button>
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
        </div>
      )}

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="adm-page">
        <Outlet />
      </main>

      {/* --- FOOTER CORPORATIVO --- */}
      <footer className="adm-footer">
        <div className="adm-footer-content">
          
          {/* Columna Marca */}
          <div className="adm-footer-brand">
            <div className="adm-footer-logo">
              <IconLeafLogo /> <span>SIGFITO</span>
            </div>
            <span className="adm-footer-subtitle">Sistema de Gestión Fitosanitaria</span>
            <p className="adm-footer-desc">
              Plataforma digital nacional para la gestión fitosanitaria en la producción agrícola de Colombia.
            </p>
            <div className="adm-footer-social">
              <a href="#" aria-label="Facebook"><IconFacebook /></a>
              <a href="#" aria-label="Instagram"><IconInstagram /></a>
              <a href="#" aria-label="LinkedIn"><IconLinkedIn /></a>
            </div>
          </div>

          {/* Columnas de Enlaces */}
          <div className="adm-footer-links">
            <h4>Producto</h4>
            <a href="#">Panel Administrativo</a>
            <a href="#">Catálogo Fitosanitario</a>
            <a href="#">Inspecciones</a>
            <a href="#">Reportes</a>
          </div>

          <div className="adm-footer-links">
            <h4>Compañía</h4>
            <a href="#">Sobre SIGFITO</a>
            <a href="#">Nuestra misión</a>
            <a href="#">Políticas</a>
            <a href="#">Términos de uso</a>
          </div>

          <div className="adm-footer-links">
            <h4>Ayuda</h4>
            <a href="#">Centro de ayuda</a>
            <a href="#">Documentación</a>
            <a href="#">Preguntas frecuentes</a>
            <a href="#">Soporte técnico</a>
          </div>

          {/* Columna Contacto */}
          <div className="adm-footer-contact">
            <h4>Contacto</h4>
            <div className="contact-item"><IconPhone /> +57 601 123 4567</div>
            <div className="contact-item"><IconMail /> soporte@sigfito.gov.co</div>
            <div className="contact-item"><IconMapPin /> Bucaramanga, Colombia</div>
          </div>
        </div>
        
        {/* Franja Inferior */}
        <div className="adm-footer-bottom">
          <p>© {new Date().getFullYear()} SIGFITO. Todos los derechos reservados.</p>
          <p>Creado por Miguel Buitrago, Johan Caro, Luis Álvarez y Julián Torres.</p>
        </div>
      </footer>

      {/* Overlay oscuro para el menú lateral */}
      {menuOpen && (
        <div className="adm-overlay" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  )
}

/* ── SVG Icons ─────────────────────────────── */
const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }

function IconDashboard() { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function IconUsers() { return <svg viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconPlaga() { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function IconCultivo() { return <svg viewBox="0 0 24 24" {...S}><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg> }
function IconInspeccion() { return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IconReporte() { return <svg viewBox="0 0 24 24" {...S}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function IconLogout() { return <svg viewBox="0 0 24 24" {...S}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function IconCalendar() { return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconMenu() { return <svg viewBox="0 0 24 24" {...S}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> }
function IconChevronDown() { return <svg viewBox="0 0 24 24" {...S}><polyline points="6 9 12 15 18 9"/></svg>}

/* Icono clonado exactamente del layout del productor */
function IconLeafLogo() { 
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#0B4632"/>
      <path d="M12 6C9.5 9 8.5 11.5 12 15C15.5 11.5 14.5 9 12 6Z" fill="#10B981"/>
    </svg>
  )
}

function IconX() { return <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
function IconPhone() { return <svg viewBox="0 0 24 24" {...S}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
function IconMail() { return <svg viewBox="0 0 24 24" {...S}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
function IconMapPin() { return <svg viewBox="0 0 24 24" {...S}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
function IconFacebook() { return <svg viewBox="0 0 24 24" {...S}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>}
function IconInstagram() { return <svg viewBox="0 0 24 24" {...S}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>}
function IconLinkedIn() { return <svg viewBox="0 0 24 24" {...S}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>}