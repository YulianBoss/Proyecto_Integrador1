import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AdminDashboard.css'

const DASH_CARDS = [
  {
    title: 'Gestion Usuarios',
    subtitle: 'Administra usuarios y solicitudes pendientes.',
    to: '/admin/usuarios',
    tone: 'users',
    buttonText: 'Ir a usuarios',
    icon: <IconUsers />,
  },
  {
    title: 'Gestion Plagas',
    subtitle: 'Consulta y organiza el catálogo fitosanitario.',
    to: '/admin/plagas',
    tone: 'pests',
    buttonText: 'Ir a plagas',
    icon: <IconBug />,
  },
  {
    title: 'Gestion Cultivos',
    subtitle: 'Visualiza especies y cobertura de cultivo.',
    to: '/admin/cultivos',
    tone: 'crops',
    buttonText: 'Ir a cultivos',
    icon: <IconFlower />,
  },
  {
    title: 'Consultar Inspecciones',
    subtitle: 'Revisa y supervisa las inspecciones registradas.',
    to: '/admin/inspecciones',
    tone: 'inspect',
    buttonText: 'Ir a inspecciones',
    icon: <IconClipboard />,
  }
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.nombre || 'Juan Perez'

  const goTo = (to) => {
    navigate(to)
  }

  return (
    <section className="ad-dash-root">
      
      {/* Banner de Bienvenida (Hero) */}
      <header className="ad-dash-hero">
        <div className="ad-dash-hero__pattern"></div>
        <div className="ad-dash-hero__leaves"></div>
        <div className="ad-dash-hero__content">
          <span className="ad-dash-kicker">BIENVENIDO</span>
          <h2>¡Hola, {displayName}!</h2>
          <p>Desde aquí puedes administrar y supervisar todo el sistema fitosanitario.</p>
        </div>
      </header>

      {/* Encabezado de la Sección */}
      <div className="ad-dash-header">
        <h3>Módulos del sistema</h3>
        <p>Selecciona un módulo para gestionar la información del sistema.</p>
      </div>

      {/* Cuadrícula de Tarjetas */}
      <div className="ad-dash-grid">
        {DASH_CARDS.map((card, idx) => (
          <article
            key={card.title}
            className={`ad-card ad-card--${card.tone}`}
            style={{ animationDelay: `${idx * 110}ms` }}
            onClick={() => goTo(card.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                goTo(card.to)
              }
            }}
          >
            {/* Parte superior: Icono principal y botón de info */}
            <div className="ad-card__top">
              <div className="ad-card__icon-wrapper">
                {card.icon}
              </div>
              <button 
                className="ad-card__info-btn" 
                aria-label="Información" 
                onClick={(e) => e.stopPropagation()}
              >
                i
              </button>
            </div>
            
            {/* Cuerpo: Títulos y descripción */}
            <div className="ad-card__body">
              <h4>{card.title}</h4>
              <p>{card.subtitle}</p>
            </div>

            {/* Pie: Línea separadora y enlace de acción */}
            <div className="ad-card__footer">
              <span className="ad-card__link-text">{card.buttonText}</span>
              <span className="ad-card__link-icon"><IconArrowRight /></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ── SVG Icons ─────────────────────────────────────────────── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round' }

function IconUsers() { return <svg viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg> }
function IconBug() { return <svg viewBox="0 0 24 24" {...S}><path d="M8 6h8"/><path d="M9 3h6l1 3H8l1-3z"/><rect x="7" y="6" width="10" height="13" rx="4"/><path d="M4 10h3"/><path d="M17 10h3"/><path d="M4 14h3"/><path d="M17 14h3"/></svg> }
function IconFlower() { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="6.8" r="2.1"/><circle cx="16.4" cy="9" r="2.1"/><circle cx="16" cy="14" r="2.1"/><circle cx="8" cy="14" r="2.1"/><circle cx="7.6" cy="9" r="2.1"/></svg> }
function IconClipboard() { return <svg viewBox="0 0 24 24" {...S}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IconArrowRight() { return <svg viewBox="0 0 24 24" {...S}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> }