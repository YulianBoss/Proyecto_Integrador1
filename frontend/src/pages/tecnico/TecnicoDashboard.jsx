import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function TecnicoDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.nombre || 'Técnico'

  return (
    <section className="tc-dash">
      <header className="tc-dash__hero">
        <span className="tc-dash__orb tc-dash__orb--a" />
        <span className="tc-dash__orb tc-dash__orb--b" />
        <p className="tc-dash__kicker">Panel del Asistente Técnico</p>
        <h2>Bienvenido, {displayName}</h2>
        <p className="tc-dash__sub">
          Desde aquí puedes gestionar tus inspecciones fitosanitarias asignadas.
        </p>
      </header>

      <div className="tc-dash__grid">
        <article
          className="tc-card tc-card--primary"
          onClick={() => navigate('/tecnico/inspecciones')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/tecnico/inspecciones') } }}
        >
          <div className="tc-card__body">
            <h3>Mis Inspecciones</h3>
            <p>Consulta y realiza las inspecciones fitosanitarias pendientes que tienes asignadas</p>
          </div>
          <div className="tc-card__icon" aria-hidden="true">
            <IcoClipboard />
          </div>
        </article>

        <article className="tc-card tc-card--info">
          <div className="tc-card__body">
            <h3>¿Cómo funciona?</h3>
            <ol className="tc-steps">
              <li><span className="tc-step__num">1</span> Ve a <strong>Mis Inspecciones</strong> para ver las pendientes.</li>
              <li><span className="tc-step__num">2</span> Inicia la inspección cuando llegues al lugar.</li>
              <li><span className="tc-step__num">3</span> Completa el formulario con observaciones y concepto técnico.</li>
            </ol>
          </div>
          <div className="tc-card__icon" aria-hidden="true">
            <IcoInfo />
          </div>
        </article>
      </div>

      <style>{`
        .tc-dash {
          max-width: 860px;
        }
        .tc-dash__hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1e2a4a 0%, #3b4fa8 100%);
          border-radius: 16px;
          padding: clamp(1.5rem, 5vw, 2.5rem) clamp(1.5rem, 5vw, 2.5rem);
          margin-bottom: 1.75rem;
          color: #fff;
        }
        .tc-dash__orb {
          position: absolute;
          border-radius: 50%;
          opacity: 0.12;
          pointer-events: none;
        }
        .tc-dash__orb--a {
          width: 260px; height: 260px;
          background: #6272d4;
          top: -80px; right: -60px;
        }
        .tc-dash__orb--b {
          width: 180px; height: 180px;
          background: #a5b4fc;
          bottom: -60px; right: 80px;
        }
        .tc-dash__kicker {
          font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.55); margin: 0 0 0.4rem;
        }
        .tc-dash__hero h2 {
          margin: 0 0 0.5rem; font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800;
        }
        .tc-dash__sub { margin: 0; font-size: 0.88rem; color: rgba(255,255,255,0.72); max-width: 480px; }

        .tc-dash__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .tc-card {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          border-radius: 14px;
          padding: 1.5rem;
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s;
          border: 1.5px solid transparent;
          text-decoration: none;
          outline: none;
          animation: tcFadeUp 0.35s ease both;
        }
        .tc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(60,80,180,0.15); }
        .tc-card:focus-visible { outline: 2px solid #6272d4; outline-offset: 2px; }

        .tc-card--primary {
          background: linear-gradient(135deg, #eef0fb 0%, #dde2f7 100%);
          border-color: #c5cdf0;
        }
        .tc-card--info {
          background: #fff;
          border-color: #e5e9f0;
          cursor: default;
        }
        .tc-card--info:hover { transform: none; box-shadow: none; }

        .tc-card__body { flex: 1; min-width: 0; }
        .tc-card__body h3 { margin: 0 0 0.4rem; font-size: 1.05rem; color: #1e2a4a; font-weight: 700; }
        .tc-card__body p  { margin: 0; font-size: 0.84rem; color: #5b6b8a; line-height: 1.5; }

        .tc-card__icon {
          width: 48px; height: 48px; flex-shrink: 0;
          border-radius: 12px;
          background: #3b4fa8;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
        }
        .tc-card--info .tc-card__icon { background: #f0f4ff; color: #3b4fa8; }
        .tc-card__icon svg { width: 22px; height: 22px; }

        .tc-steps { margin: 0.5rem 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.55rem; }
        .tc-steps li { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.84rem; color: #374151; }
        .tc-step__num {
          width: 20px; height: 20px; border-radius: 50%;
          background: #3b4fa8; color: #fff;
          font-size: 0.65rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }

        @keyframes tcFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
function IcoClipboard() {
  return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
function IcoInfo() {
  return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
}
