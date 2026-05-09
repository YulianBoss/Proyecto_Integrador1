import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tecnicoAPI } from '../../services/api'

export default function TecnicoDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.nombre || 'Técnico'
  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargarInspecciones = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await tecnicoAPI.misInspecciones()
        setInspecciones(Array.isArray(res.data) ? res.data : [])
      } catch {
        setError('No fue posible cargar las inspecciones próximas.')
      } finally {
        setLoading(false)
      }
    }

    cargarInspecciones()
  }, [])

  const proximasInspecciones = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    return inspecciones
      .filter((insp) => ['pendiente', 'en_proceso'].includes(insp.estado))
      .map((insp) => {
        const baseDate = insp.fecha_programada || insp.fecha_solicitud
        const fecha = baseDate ? new Date(baseDate) : null
        return { ...insp, _fechaOrden: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null }
      })
      .sort((a, b) => {
        if (!a._fechaOrden && !b._fechaOrden) return 0
        if (!a._fechaOrden) return 1
        if (!b._fechaOrden) return -1
        return a._fechaOrden - b._fechaOrden
      })
      .filter((insp) => !insp._fechaOrden || insp._fechaOrden >= hoy)
      .slice(0, 5)
  }, [inspecciones])

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha programada'
    const d = new Date(fecha)
    if (Number.isNaN(d.getTime())) return 'Sin fecha programada'
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  }

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
            <h3>Consultar inspecciones</h3>
            <p>Revisa todas tus inspecciones asignadas y su estado actual.</p>
          </div>
          <div className="tc-card__icon" aria-hidden="true">
            <IcoClipboard />
          </div>
        </article>

        <article
          className="tc-card tc-card--secondary"
          onClick={() => navigate('/tecnico/inspecciones')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/tecnico/inspecciones') } }}
        >
          <div className="tc-card__body">
            <h3>Realizar inspecciones</h3>
            <p>Inicia y completa tus inspecciones pendientes con observaciones y concepto técnico.</p>
          </div>
          <div className="tc-card__icon" aria-hidden="true">
            <IcoPlay />
          </div>
        </article>
      </div>

      <section className="tc-notis" aria-live="polite">
        <header className="tc-notis__head">
          <h3>Notificaciones de inspecciones próximas</h3>
          <button type="button" onClick={() => navigate('/tecnico/inspecciones')}>Ver todas</button>
        </header>

        {loading ? (
          <p className="tc-notis__empty">Cargando inspecciones próximas...</p>
        ) : error ? (
          <p className="tc-notis__error">{error}</p>
        ) : proximasInspecciones.length === 0 ? (
          <p className="tc-notis__empty">No tienes inspecciones próximas por realizar.</p>
        ) : (
          <div className="tc-notis__list">
            {proximasInspecciones.map((insp) => (
              <article key={insp.id} className="tc-noti">
                <p className="tc-noti__title">
                  Inspección a realizar el día: <strong>{formatearFecha(insp.fecha_programada || insp.fecha_solicitud)}</strong>
                </p>
                <p className="tc-noti__meta">
                  Predio: <strong>{insp.predio_nombre || 'No registrado'}</strong>
                </p>
                <p className="tc-noti__meta">
                  Lugar de producción: <strong>{insp.lugar_nombre || `Lugar #${insp.lugar_produccion_id}`}</strong>
                </p>
                <p className="tc-noti__meta">
                  Lote: <strong>{insp.lote_codigo || `Lote #${insp.lote_id}`}</strong>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .tc-dash {
          max-width: 960px;
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
        .tc-card--secondary {
          background: linear-gradient(135deg, #fff7eb 0%, #ffe6c2 100%);
          border-color: #ffd394;
        }

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
        .tc-card--secondary .tc-card__icon { background: #b45309; color: #fff; }
        .tc-card__icon svg { width: 22px; height: 22px; }

        .tc-notis {
          margin-top: 1.5rem;
          background: #fff;
          border-radius: 14px;
          border: 1.5px solid #e5e9f0;
          padding: 1.1rem;
        }
        .tc-notis__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.9rem;
        }
        .tc-notis__head h3 {
          margin: 0;
          color: #1e2a4a;
          font-size: 1rem;
        }
        .tc-notis__head button {
          border: 1px solid #c5cdf0;
          background: #f5f7ff;
          color: #3b4fa8;
          border-radius: 8px;
          padding: 0.38rem 0.75rem;
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .tc-notis__list {
          display: grid;
          gap: 0.7rem;
        }
        .tc-noti {
          border: 1px solid #e6ecfa;
          border-left: 5px solid #3b4fa8;
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          background: #fbfcff;
        }
        .tc-noti__title {
          margin: 0 0 0.35rem;
          color: #1f2937;
          font-size: 0.84rem;
        }
        .tc-noti__meta {
          margin: 0.15rem 0;
          color: #4b5563;
          font-size: 0.8rem;
        }
        .tc-notis__empty {
          margin: 0;
          color: #6b7280;
          font-size: 0.84rem;
        }
        .tc-notis__error {
          margin: 0;
          color: #b91c1c;
          font-size: 0.84rem;
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
function IcoPlay() {
  return <svg viewBox="0 0 24 24" {...S}><polygon points="5 3 19 12 5 21 5 3"/></svg>
}
