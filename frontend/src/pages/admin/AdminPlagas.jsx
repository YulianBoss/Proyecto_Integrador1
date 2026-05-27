import { useNavigate } from 'react-router-dom'
import './AdminMockPages.css'
import './AdminDashboard.css'
import './AdminPlagas.css'

export default function AdminPlagas() {
  const navigate = useNavigate()

  return (
    <section className="mock-admin-page">
      <header>
        <h2>Gestion de Plagas</h2>
        <p>Selecciona una opcion para ir a otra pagina del modulo de plagas.</p>
      </header>

      <div className="ad-dash-grid plagas-nav-grid">
        <article
          className="ad-card ad-card--crops plagas-nav-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/plagas/crear')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/admin/plagas/crear')
            }
          }}
        >
          <div className="ad-card__body">
            <h3>Crear plaga</h3>
            <p>Abre la pagina de registro de nuevas plagas.</p>
          </div>
          <div className="ad-card__icon-wrapper" aria-hidden="true"><IconPlusBug /></div>
        </article>

        <article
          className="ad-card ad-card--pests plagas-nav-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/admin/plagas/editar')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/admin/plagas/editar')
            }
          }}
        >
          <div className="ad-card__body">
            <h3>Editar o eliminar plaga</h3>
            <p>Abre la pagina para editar, desactivar o eliminar plagas.</p>
          </div>
          <div className="ad-card__icon-wrapper" aria-hidden="true"><IconEditBug /></div>
        </article>
      </div>
    </section>
  )
}

function IconPlusBug() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h8"/><path d="M9 3h6l1 3H8l1-3z"/><rect x="7" y="6" width="10" height="13" rx="4"/><path d="M4 10h3"/><path d="M17 10h3"/><path d="M4 14h3"/><path d="M17 14h3"/><path d="M12 10v5"/><path d="M9.5 12.5h5"/></svg>
}

function IconEditBug() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h8"/><path d="M9 3h6l1 3H8l1-3z"/><rect x="7" y="6" width="10" height="13" rx="4"/><path d="M4 10h3"/><path d="M17 10h3"/><path d="M4 14h3"/><path d="M17 14h3"/><path d="m9.2 16.8 1.1-3.1 4.9-4.9 2 2-4.9 4.9-3.1 1.1z"/></svg>
}
