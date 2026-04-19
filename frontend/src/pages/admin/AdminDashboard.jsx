import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AdminDashboard.css'

const DASH_CARDS = [
  {
    title: 'Gestion Usuarios',
    subtitle: 'Administra usuarios y solicitudes pendientes',
    to: '/admin/usuarios',
    tone: 'users',
    icon: <IconUsers />,
  },
  {
    title: 'Gestion Plagas',
    subtitle: 'Consulta y organiza el catalogo fitosanitario',
    to: '/admin/plagas',
    tone: 'pests',
    icon: <IconBug />,
  },
  {
    title: 'Gestion Cultivos',
    subtitle: 'Visualiza especies y cobertura de cultivo',
    to: '/admin/cultivos',
    tone: 'crops',
    icon: <IconFlower />,
  },
]

const PEST_INDEX = [
  { label: 'Broca', value: 84, color: 'var(--ad-bar-a)' },
  { label: 'Roya', value: 61, color: 'var(--ad-bar-b)' },
  { label: 'Mosca Blanca', value: 47, color: 'var(--ad-bar-c)' },
  { label: 'Trips', value: 35, color: 'var(--ad-bar-d)' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.nombre || 'Administrador'

  const goTo = (to) => {
    navigate(to)
  }

  return (
    <section className="ad-dash-root">
      <header className="ad-dash-hero">
        <span className="ad-dash-orb ad-dash-orb--a" />
        <span className="ad-dash-orb ad-dash-orb--b" />
        <p className="ad-dash-kicker">Panel administrativo</p>
        <h2>Bienvenido {displayName}</h2>
        <p>Selecciona un modulo para continuar con la gestion del sistema fitosanitario.</p>
      </header>

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
            <div className="ad-card__body">
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
            </div>
            <div className="ad-card__icon" aria-hidden="true">{card.icon}</div>
          </article>
        ))}

        <article className="ad-card ad-card--chart">
          <div className="ad-chart__header">
            <h3>Indice de Plagas en Cultivos</h3>
            <span>Actualizado hoy</span>
          </div>

          <div className="ad-bars" aria-label="indice de plagas">
            {PEST_INDEX.map((item, idx) => (
              <div key={item.label} className="ad-bar-row" style={{ animationDelay: `${130 + idx * 90}ms` }}>
                <div className="ad-bar-row__top">
                  <strong>{item.label}</strong>
                  <small>{item.value}%</small>
                </div>
                <div className="ad-bar-track">
                  <span className="ad-bar-fill" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="ad-chart__cta" onClick={() => goTo('/admin/plagas')}>
            Ver detalle de plagas
          </button>
        </article>
      </div>
    </section>
  )
}

function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
}

function IconBug() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h8"/><path d="M9 3h6l1 3H8l1-3z"/><rect x="7" y="6" width="10" height="13" rx="4"/><path d="M4 10h3"/><path d="M17 10h3"/><path d="M4 14h3"/><path d="M17 14h3"/></svg>
}

function IconFlower() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="6.8" r="2.1"/><circle cx="16.4" cy="9" r="2.1"/><circle cx="16" cy="14" r="2.1"/><circle cx="8" cy="14" r="2.1"/><circle cx="7.6" cy="9" r="2.1"/></svg>
}
