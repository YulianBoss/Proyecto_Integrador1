import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productionAPI, inspeccionesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import './productor.css'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }

const DASH_CARDS = [
  {
    title: 'Lugares de Producción',
    subtitle: 'Administra tus predios y lugares registrados.',
    button: 'Gestionar lugares',
    to: '/productor/lugares',
    tone: 'green',
    icon: <IcoHome />,
  },
  {
    title: 'Lotes',
    subtitle: 'Gestiona los lotes de cada lugar de producción.',
    button: 'Ver lotes',
    to: '/productor/lotes',
    tone: 'blue',
    icon: <IcoMap />,
  },
  {
    title: 'Solicitar Inspección',
    subtitle: 'Crea una nueva solicitud de inspección fitosanitaria.',
    button: 'Nueva solicitud',
    to: '/productor/solicitar',
    tone: 'orange',
    icon: <IcoClip />,
  },
  {
    title: 'Historial',
    subtitle: 'Consulta el estado de tus inspecciones anteriores.',
    button: 'Ver historial',
    to: '/productor/historial',
    tone: 'teal',
    icon: <IcoFolder />,
  },
]

// Íconos vectoriales limpios
function IcoHome()   { return <svg viewBox="0 0 24 24" {...S}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function IcoMap()    { return <svg viewBox="0 0 24 24" {...S}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg> }
function IcoClip()   { return <svg viewBox="0 0 24 24" {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function IcoFolder() { return <svg viewBox="0 0 24 24" {...S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
function IcoClock()  { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IcoCheck()  { return <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg> }
function IcoWarn()   { return <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }

export default function ProductorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lugares, setLugares]           = useState([])
  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading]           = useState(true)

  const displayName = user?.nombre || 'Jose Gomez'

  useEffect(() => {
    const cargar = async () => {
      try {
        const [lRes, iRes] = await Promise.all([
          productionAPI.getAll(),
          inspeccionesAPI.misSolicitudes()
        ])
        setLugares(lRes.data || [])
        setInspecciones(iRes.data || [])
      } catch { /* Manejo silencioso si no hay datos */ }
      finally  { setLoading(false) }
    }
    cargar()
  }, [])

  // Mapeo y cálculos en tiempo real
  const totalLugares    = lugares.length
  const totalLotes      = lugares.reduce((a, l) => a + (l.lotes?.length || 0), 0)
  const pendientes      = inspecciones.filter(i => i.estado === 'pendiente').length
  const completadas     = inspecciones.filter(i => i.estado === 'completada').length

  const alertas = lugares.filter(l => {
    if (!l.fecha_proxima_inspeccion) return false
    const diff = (new Date(l.fecha_proxima_inspeccion) - new Date()) / 86400000
    return diff >= 0 && diff <= 7
  })

  if (loading) return (
    <div className="p-loading"><span className="p-spinner" /> Cargando panel...</div>
  )

  return (
    <div className="dashboard-content-area">
      
      {/* RENDER DE ALERTAS ACTIVAS */}
      {alertas.length > 0 && (
        <div className="alerts-container">
          {alertas.map(l => (
            <div key={l.id} className="p-alert p-alert--warn">
              <IcoWarn />
              <span>
                El lugar <strong>{l.nombre}</strong> tiene una inspección próxima el{' '}
                <strong>{new Date(l.fecha_proxima_inspeccion).toLocaleDateString('es-CO')}</strong>.{' '}
                <Link to="/productor/solicitar" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Solicitar ahora
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 1. HERO BANNER BIENVENIDA */}
      <section className="welcome-banner">
        <div className="banner-content">
          <h2>¡Bienvenido, {displayName}!</h2>
          <p>Gestiona tus predios, lotes e inspecciones fitosanitarias de manera eficiente y segura.</p>
        </div>
        <div className="banner-pattern"></div>
      </section>

      {/* 2. RESUMEN GENERAL (KPI CARDS) */}
      <section className="dashboard-section">
        <h3 className="section-title">Resumen general <span className="info-icon" title="Estadísticas de tu cuenta">ⓘ</span></h3>
        <div className="kpi-grid">
          
          <div className="kpi-card">
            <div className="kpi-icon-wrapper tone-green"><IcoHome /></div>
            <div className="kpi-value">{totalLugares}</div>
            <div className="kpi-label">Lugares registrados</div>
            <span className="kpi-badge badge-green">✓ Todos activos</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper tone-blue"><IcoMap /></div>
            <div className="kpi-value">{totalLotes}</div>
            <div className="kpi-label">Lotes totales</div>
            <span className="kpi-badge badge-blue">✓ Registrados</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper tone-orange"><IcoClock /></div>
            <div className="kpi-value">{pendientes}</div>
            <div className="kpi-label">Inspecciones pendientes</div>
            <span className={`kpi-badge ${pendientes > 0 ? 'badge-warn' : 'badge-orange'}`}>
              ✓ Al día
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper tone-teal"><IcoCheck /></div>
            <div className="kpi-value">{completadas}</div>
            <div className="kpi-label">Inspecciones completadas</div>
            <span className="kpi-badge badge-teal">✓ Historial</span>
          </div>

        </div>
      </section>

      {/* 3. ACCESOS RÁPIDOS */}
      <section className="dashboard-section">
        <h3 className="section-title no-margin">Accesos rápidos</h3>
        <p className="section-subtitle">Selecciona un módulo para comenzar</p>
        
        <div className="action-grid">
          {DASH_CARDS.map((card) => (
            <div 
              key={card.title} 
              className="action-card"
              onClick={() => navigate(card.to)}
            >
              <div className={`action-icon-box box-${card.tone}`}>{card.icon}</div>
              <h4>{card.title}</h4>
              <p>{card.subtitle}</p>
              <button 
                className={`action-btn btn-text-${card.tone}`}
                onClick={(e) => { e.stopPropagation(); navigate(card.to) }}
              >
                {card.button} <span className="arrow">→</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. BANNER COMPAÑÍA INTERMEDIO */}
      <section className="info-row-banner">
        <div className="info-badge-icon">🌱</div>
        <div className="info-text-block">
          <h4>SIGFITO te acompaña en cada etapa</h4>
          <p>Nuestro objetivo es garantizar una producción agrícola segura, trazable y competitiva para el campo colombiano.</p>
        </div>
        <div className="info-graphic-landscape"></div>
      </section>

    </div>
  )
}