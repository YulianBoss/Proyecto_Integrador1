import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productionAPI, inspeccionesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import './productor.css'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }

const DASH_CARDS = [
  {
    title: 'Lugares de Produccion',
    subtitle: 'Administra tus predios y lugares registrados',
    to: '/productor/lugares',
    tone: 'green',
    icon: <IcoHome />,
  },
  {
    title: 'Lotes',
    subtitle: 'Gestiona los lotes de cada lugar de produccion',
    to: '/productor/lotes',
    tone: 'blue',
    icon: <IcoMap />,
  },
  {
    title: 'Solicitar Inspeccion',
    subtitle: 'Crea una nueva solicitud de inspeccion fitosanitaria',
    to: '/productor/solicitar',
    tone: 'yellow',
    icon: <IcoClip />,
  },
  {
    title: 'Historial',
    subtitle: 'Consulta el estado de tus inspecciones anteriores',
    to: '/productor/historial',
    tone: 'teal',
    icon: <IcoFolder />,
  },
]
function IcoHome()   { return <svg viewBox="0 0 24 24" {...S}><path d="M3 12L12 3l9 9v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg> }
function IcoMap()    { return <svg viewBox="0 0 24 24" {...S}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> }
function IcoClip()   { return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IcoFolder() { return <svg viewBox="0 0 24 24" {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
function IcoClock()  { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IcoCheck()  { return <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg> }
function IcoWarn()   { return <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IcoDoc()    { return <svg viewBox="0 0 24 24" {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function IcoPlus()   { return <svg viewBox="0 0 24 24" {...S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IcoArrow()  { return <svg viewBox="0 0 24 24" {...S}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> }

function Badge({ estado }) {
  const mapa = {
    activo: 'activo', pendiente: 'pendiente',
    en_proceso: 'proceso', completada: 'completada',
    cosechado: 'cosechado', inactivo: 'inactivo', en_preparacion: 'preparacion'
  }
  const texto = {
    activo: 'Activo', pendiente: 'Pendiente',
    en_proceso: 'En Proceso', completada: 'Completada',
    cosechado: 'Cosechado', inactivo: 'Inactivo', en_preparacion: 'En Preparacion'
  }
  return <span className={`p-badge p-badge--${mapa[estado] || 'inactivo'}`}>{texto[estado] || estado}</span>
}

function IncidenciaTag({ valor }) {
  if (!valor && valor !== 0) return <span className="p-td-muted">—</span>
  const n = parseFloat(valor)
  const cls = n >= 20 ? 'p-inci-alto' : n >= 10 ? 'p-inci-medio' : 'p-inci-bajo'
  return <span className={cls}>{n.toFixed(1)}%</span>
}

export default function ProductorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lugares, setLugares]           = useState([])
  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading]           = useState(true)

  const displayName = user?.nombre || 'Productor'

  useEffect(() => {
    const cargar = async () => {
      try {
        const [lRes, iRes] = await Promise.all([
          productionAPI.getAll(),
          inspeccionesAPI.misSolicitudes()
        ])
        setLugares(lRes.data || [])
        setInspecciones(iRes.data || [])
      } catch { /* sin datos todavia */ }
      finally  { setLoading(false) }
    }
    cargar()
  }, [])

  // Stats derivados
  const totalLugares    = lugares.length
  const totalLotes      = lugares.reduce((a, l) => a + (l.lotes?.length || 0), 0)
  const pendientes      = inspecciones.filter(i => i.estado === 'pendiente').length
  const completadas     = inspecciones.filter(i => i.estado === 'completada').length
  const ultimas5        = [...inspecciones].slice(0, 5)

  // Alerta: inspeccion proxima vencida (simulada por fecha_proxima_inspeccion)
  const alertas = lugares.filter(l => {
    if (!l.fecha_proxima_inspeccion) return false
    const diff = (new Date(l.fecha_proxima_inspeccion) - new Date()) / 86400000
    return diff >= 0 && diff <= 7
  })

  if (loading) return (
    <div className="p-loading"><span className="p-spinner" /> Cargando dashboard...</div>
  )

  return (
    <div className="pd-root">
      {/* Alertas */}
      {alertas.map(l => (
        <div key={l.id} className="p-alert p-alert--warn">
          <IcoWarn />
          <span>
            El lugar <strong>{l.nombre}</strong> tiene una inspeccion proxima el{' '}
            <strong>{new Date(l.fecha_proxima_inspeccion).toLocaleDateString('es-CO')}</strong>.{' '}
            <Link to="/productor/solicitar" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Solicitar ahora
            </Link>
          </span>
        </div>
      ))}

      {/* Hero */}
      <header className="pd-hero">
        <span className="pd-hero__orb pd-hero__orb--a" />
        <span className="pd-hero__orb pd-hero__orb--b" />
        <p className="pd-hero__kicker">Panel del productor</p>
        <h2>Bienvenido, {displayName}</h2>
        <p>Selecciona un modulo para gestionar tus lugares, lotes e inspecciones fitosanitarias.</p>
      </header>

      {/* Tarjetas 2x2 */}
      <div className="pd-grid">
        {DASH_CARDS.map((card, idx) => (
          <article
            key={card.title}
            className={`pd-card pd-card--${card.tone}`}
            style={{ animationDelay: `${idx * 110}ms` }}
            onClick={() => navigate(card.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(card.to) } }}
          >
            <div className="pd-card__body">
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
            </div>
            <div className="pd-card__icon" aria-hidden="true">{card.icon}</div>
          </article>
        ))}
      </div>

      {/* Stats */}
      <div className="p-stats-grid">
        <div className="p-stat-card">
          <div className="p-stat-icon p-stat-icon--green"><IcoHome /></div>
          <div>
            <div className="p-stat-value">{totalLugares}</div>
            <div className="p-stat-label">Lugares Registrados</div>
            <span className="p-stat-sub p-stat-sub--green"><IcoCheck /> Todos activos</span>
          </div>
        </div>
        <div className="p-stat-card">
          <div className="p-stat-icon p-stat-icon--blue"><IcoMap /></div>
          <div>
            <div className="p-stat-value">{totalLotes}</div>
            <div className="p-stat-label">Lotes Totales</div>
            <span className="p-stat-sub p-stat-sub--blue">Registrados</span>
          </div>
        </div>
        <div className="p-stat-card">
          <div className="p-stat-icon p-stat-icon--yellow"><IcoClock /></div>
          <div>
            <div className="p-stat-value">{pendientes}</div>
            <div className="p-stat-label">Inspecciones Pendientes</div>
            {pendientes > 0
              ? <span className="p-stat-sub p-stat-sub--yellow"><IcoWarn /> Requieren atencion</span>
              : <span className="p-stat-sub p-stat-sub--green"><IcoCheck /> Al dia</span>}
          </div>
        </div>
        <div className="p-stat-card">
          <div className="p-stat-icon p-stat-icon--green"><IcoCheck /></div>
          <div>
            <div className="p-stat-value">{completadas}</div>
            <div className="p-stat-label">Inspecciones Completadas</div>
            <span className="p-stat-sub p-stat-sub--green">Historial</span>
          </div>
        </div>
      </div>

      {/* Ultimas inspecciones */}
      <div className="p-section">
        <div className="p-section__header">
          <div>
            <h3>Ultimas Inspecciones</h3>
            <p>Estado actual de sus solicitudes de inspeccion</p>
          </div>
          <Link to="/productor/solicitar" className="p-btn p-btn--green p-btn--sm">
            <IcoPlus /> Solicitar nueva
          </Link>
        </div>
        <div className="p-section__body">
          {ultimas5.length === 0 ? (
            <div className="p-empty">
              <IcoDoc />
              <p>No hay inspecciones registradas aun.</p>
              <Link to="/productor/solicitar" className="p-btn p-btn--green p-btn--sm">
                Solicitar la primera
              </Link>
            </div>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Lugar</th>
                    <th>Fecha solicitud</th>
                    <th>Tecnico asignado</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimas5.map(ins => (
                    <tr key={ins.id}>
                      <td><strong>Lugar #{ins.lugar_produccion_id}</strong></td>
                      <td className="p-td-muted">
                        {ins.fecha_solicitud
                          ? new Date(ins.fecha_solicitud).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="p-td-muted">
                        {ins.asistente_id ? `Tecnico #${ins.asistente_id}` : '— Sin asignar'}
                      </td>
                      <td><Badge estado={ins.estado} /></td>
                      <td>
                        {ins.estado === 'completada' ? (
                          <Link to="/productor/historial" className="p-btn p-btn--blue p-btn--sm">
                            <IcoDoc /> Ver informe
                          </Link>
                        ) : (
                          <Link to="/productor/historial" className="p-btn p-btn--outline p-btn--sm">
                            <IcoArrow /> Seguimiento
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mis lugares — resumen rapido */}
      <div className="p-section">
        <div className="p-section__header">
          <div>
            <h3>Mis Lugares de Produccion</h3>
            <p>Vista rapida de sus predios registrados</p>
          </div>
          <Link to="/productor/lugares" className="p-btn p-btn--outline p-btn--sm">
            Ver todos <IcoArrow />
          </Link>
        </div>
        <div className="p-section__body">
          {lugares.length === 0 ? (
            <div className="p-empty">
              <IcoHome />
              <p>No tiene lugares registrados.</p>
              <Link to="/productor/lugares" className="p-btn p-btn--green p-btn--sm">
                Registrar primer lugar
              </Link>
            </div>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Lugar</th>
                    <th>Municipio</th>
                    <th>Area (ha)</th>
                    <th>Registro ICA</th>
                    <th>Proxima inspeccion</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lugares.slice(0, 5).map(l => {
                    const proxima    = l.fecha_proxima_inspeccion ? new Date(l.fecha_proxima_inspeccion) : null
                    const dias       = proxima ? Math.ceil((proxima - new Date()) / 86400000) : null
                    const proximaCls = dias !== null && dias <= 0
                      ? 'p-inci-alto'
                      : dias !== null && dias <= 7
                      ? 'p-inci-medio'
                      : 'p-inci-bajo'

                    return (
                      <tr key={l.id}>
                        <td><strong>{l.nombre}</strong></td>
                        <td className="p-td-muted">{l.municipio}</td>
                        <td className="p-td-muted">{l.area_total_ha} ha</td>
                        <td className="p-td-muted">{l.numero_registro_ica}</td>
                        <td>
                          {proxima
                            ? <span className={proximaCls}>{proxima.toLocaleDateString('es-CO')}</span>
                            : <span className="p-td-muted">—</span>}
                        </td>
                        <td>
                          <div className="p-actions">
                            <Link to="/productor/lugares" className="p-btn p-btn--outline p-btn--sm">
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}