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

        <article
          className="ad-card ad-card--inspect"
          style={{ animationDelay: `${3 * 110}ms` }}
          onClick={() => goTo('/admin/inspecciones')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              goTo('/admin/inspecciones')
            }
          }}
        >
          <div className="ad-card__body">
            <h3>Consultar Inspecciones</h3>
            <p>Revisa y supervisa las inspecciones fitosanitarias registradas</p>
          </div>
          <div className="ad-card__icon" aria-hidden="true"><IconClipboard /></div>
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

function IconClipboard() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
