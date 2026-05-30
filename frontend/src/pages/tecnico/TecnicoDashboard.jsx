import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tecnicoAPI } from '../../services/api'

const KPI_METRICS = [
  { key: 'pendientes', title: 'Pendientes', tone: 'orange', icon: <IcoClock /> },
  { key: 'en_proceso', title: 'En proceso', tone: 'blue', icon: <IcoPlay /> },
  { key: 'completadas', title: 'Completadas', tone: 'green', icon: <IcoCheck /> },
]

const PRIMARY_ACTION_TO = '/tecnico/inspecciones'

export default function TecnicoDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.nombre || 'Técnico'

  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState('')
  const [notifications, setNotifications] = useState({
    nuevas_asignaciones: [],
    proximas_vencer: [],
    recientes_completadas: [],
  })

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      setError('')
      setMetricsLoading(true)
      setMetricsError('')
      try {
        const [inspeRes, metricsRes] = await Promise.all([
          tecnicoAPI.misInspecciones(),
          tecnicoAPI.dashboardMetrics(),
        ])
        setInspecciones(Array.isArray(inspeRes.data) ? inspeRes.data : [])
        if (metricsRes?.data?.metrics) {
          setMetrics(metricsRes.data.metrics)
        }
        if (metricsRes?.data?.notifications) {
          setNotifications(metricsRes.data.notifications)
        }
      } catch (err) {
        setError('No fue posible cargar las inspecciones próximas.')
        setMetricsError('No fue posible cargar las métricas del tablero.')
      } finally {
        setLoading(false)
        setMetricsLoading(false)
      }
    }

    cargarDatos()
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

  const totalAlertas = notifications.nuevas_asignaciones.length + notifications.proximas_vencer.length + notifications.recientes_completadas.length
  const proximaPrincipal = proximasInspecciones[0] || null

  return (
    <div className="dashboard-content-area">
      
      {/* Banner con nueva ilustración técnica/fitosanitaria integrada */}
      <section className="welcome-banner">
        <div className="banner-content">
          <h2>¡Bienvenido, {displayName}!</h2>
          <p>Panel de Auditoría: Gestiona tus inspecciones fitosanitarias asignadas con métricas y alertas claras.</p>
        </div>
        
        {/* Ilustración SVG alusiva al Asistente Técnico Fitosanitario */}
        <div className="banner-graphic-container">
          <svg viewBox="0 0 200 200" className="banner-svg-illustration">
            <defs>
              <linearGradient id="gradLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="gradShield" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Círculos de radar/tecnología de fondo */}
            <circle cx="110" cy="100" r="70" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <circle cx="110" cy="100" r="50" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.2" />
            {/* Escudo de protección fitosanitaria */}
            <path d="M110 40 C140 40, 160 50, 160 80 C160 120, 110 155, 110 155 C110 155, 60 120, 60 80 C60 50, 80 40, 110 40 Z" fill="url(#gradShield)" stroke="#0ea5e9" strokeWidth="2" />
            {/* Planta / Hoja Técnica */}
            <path d="M110 140 C110 140, 85 105, 85 85 C85 65, 110 55, 110 55 C110 55, 135 65, 135 85 C135 105, 110 140, 110 140 Z" fill="url(#gradLeaf)" />
            <path d="M110 55 V140" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M110 80 C118 75, 126 75, 126 75" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <path d="M110 100 C102 95, 94 95, 94 95" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            {/* Líneas de escaneo del auditor */}
            <line x1="45" y1="75" x2="175" y2="75" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 5" opacity="0.7" className="scan-line-anim" />
            {/* Nodos de datos flotantes */}
            <circle cx="55" cy="85" r="5" fill="#38bdf8" />
            <circle cx="165" cy="115" r="4" fill="#34d399" />
            <circle cx="75" cy="135" r="6" fill="#fbbf24" />
          </svg>
        </div>
        <div className="banner-pattern"></div>
      </section>

      <section className="dashboard-section">
        <div className="primary-action-panel">
          <div>
            <h3>Acción principal</h3>
            <p>Inicia y completa tus inspecciones pendientes desde un solo flujo.</p>
          </div>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => navigate(PRIMARY_ACTION_TO)}
          >
            <IcoPlay /> Realizar inspecciones
          </button>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="ph-header">
          <h2>Resumen esencial</h2>
          <p>Solo los indicadores clave para decidir tu siguiente inspección.</p>
        </div>

        {metricsLoading ? (
          <div className="p-loading">Cargando métricas...</div>
        ) : metricsError ? (
          <div className="p-alert p-alert--error">{metricsError}</div>
        ) : (
          <div className="kpi-grid">
            {KPI_METRICS.map((metric) => {
              const value = metrics?.[metric.key] ?? 0
              return (
                <div key={metric.key} className="kpi-card">
                  <div className={`kpi-icon-wrapper tone-${metric.tone}`}>{metric.icon}</div>
                  <div>
                    <div className="kpi-value">{value}</div>
                    <div className="kpi-label">{metric.title}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </section>

      <section className="dashboard-section">
        <div className="p-section p-section--compact">
          <div className="p-section__header">
            <h3>Alertas clave</h3>
            <div>
              <span className="p-badge p-badge--proceso">{totalAlertas} alertas</span>
            </div>
          </div>
          <div className="p-section__body">
            <div className="compact-alert-grid">
              {[
                { title: 'Nuevas asignaciones', count: notifications.nuevas_asignaciones.length, tone: 'blue', icon: <IcoClipboard /> },
                { title: 'Próximas a vencer', count: notifications.proximas_vencer.length, tone: 'orange', icon: <IcoClock /> },
                { title: 'Completadas recientemente', count: notifications.recientes_completadas.length, tone: 'green', icon: <IcoCheck /> },
              ].map((item) => (
                <div key={item.title} className="compact-alert-item">
                  <div className={`kpi-icon-wrapper tone-${item.tone}`}>{item.icon}</div>
                  <div>
                    <div className="compact-alert-value">{item.count}</div>
                    <div className="compact-alert-label">{item.title}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="next-inspection-card">
              {loading ? (
                <div className="p-loading">Cargando próxima inspección...</div>
              ) : error ? (
                <div className="p-alert p-alert--error">{error}</div>
              ) : !proximaPrincipal ? (
                <div className="p-alert p-alert--info">No tienes inspecciones activas por realizar.</div>
              ) : (
                <>
                  <div>
                    <strong>{formatearFecha(proximaPrincipal.fecha_programada || proximaPrincipal.fecha_solicitud)}</strong>
                    <p>
                      {proximaPrincipal.predio_nombre || 'Predio no registrado'} · {proximaPrincipal.lote_codigo || `Lote #${proximaPrincipal.lote_id}`}
                    </p>
                  </div>
                  <button type="button" className="action-btn btn-text-blue" onClick={() => navigate(PRIMARY_ACTION_TO)}>
                    Ir a realizar <span className="arrow">→</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── INYECCIÓN DE ESTILOS PROPIOS DEL ASISTENTE TÉCNICO ── */}
      <style>{`
        .dashboard-content-area { max-width: 1250px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; color: #334155; }
        
        /* Banner Exclusivo: Degradado Azul Oscuro + Ilustración Fitosanitaria */
        .welcome-banner { 
          position: relative; 
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%); 
          border-radius: 16px; 
          padding: 35px 40px; 
          color: white; 
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow: hidden; 
          margin-bottom: 32px; 
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15); 
        }
        .banner-content { position: relative; z-index: 2; max-width: 55%; }
        .banner-content h2 { margin: 0 0 10px 0; font-size: 2rem; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; }
        .banner-content p { margin: 0; font-size: 1rem; color: #cbd5e1; line-height: 1.6; font-weight: 400; }
        
        /* Contenedor e Ilustración SVG */
        .banner-graphic-container { position: relative; z-index: 2; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
        .banner-svg-illustration { width: 100%; height: 100%; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.25)); }
        
        /* Animación sutil de la línea de escaneo técnico */
        @keyframes scan { 0% { transform: translateY(-15px); } 50% { transform: translateY(45px); } 100% { transform: translateY(-15px); } }
        .scan-line-anim { animation: scan 4s infinite ease-in-out; transform-origin: center; }

        .banner-pattern { 
          position: absolute; top: 0; right: 0; bottom: 0; left: 0; opacity: 0.08; z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        /* Secciones */
        .dashboard-section { margin-bottom: 35px; }
        .primary-action-panel {
          border: 1px solid #bfdbfe;
          background: linear-gradient(120deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .primary-action-panel h3 { margin: 0 0 4px 0; color: #0f172a; font-size: 1.1rem; }
        .primary-action-panel p { margin: 0; color: #1e3a8a; font-size: 0.88rem; }
        .primary-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 999px;
          padding: 12px 20px;
          background: #1d4ed8;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(29, 78, 216, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .primary-action-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 24px rgba(29, 78, 216, 0.3); }
        .ph-header { margin-bottom: 20px; }
        .ph-header h2 { font-size: 1.35rem; color: #0f172a; margin: 0 0 6px 0; font-weight: 700; }
        .ph-header p { font-size: 0.9rem; color: #64748b; margin: 0; }

        /* Módulos de Tarjetas KPI */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); border-color: #cbd5e1; }
        .kpi-icon-wrapper { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kpi-value { font-size: 1.6rem; font-weight: 700; color: #0f172a; line-height: 1.1; }
        .kpi-label { font-size: 0.85rem; color: #64748b; font-weight: 500; margin-top: 3px; }

        /* Variantes de Color para los iconos */
        .tone-blue { background: #eff6ff; color: #2563eb; }
        .tone-orange { background: #fff7ed; color: #ea580c; }
        .tone-green { background: #f0fdf4; color: #16a34a; }
        .tone-red { background: #fef2f2; color: #dc2626; }
        .tone-purple { background: #faf5ff; color: #9333ea; }
        .tone-teal { background: #f0fdfa; color: #0d9488; }

        /* Alerta Fitosanitaria */
        .info-row-banner { display: flex; align-items: center; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; padding: 14px 20px; border-radius: 8px; }
        .info-badge-icon { font-size: 1.4rem; }
        .info-text-block h4 { margin: 0 0 2px 0; color: #0f172a; font-size: 0.95rem; font-weight: 600; }
        .info-text-block p { margin: 0; color: #475569; font-size: 0.85rem; }

        /* Contenedores de Paneles / Notificaciones */
        .p-section { border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .p-section__header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .p-section__header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 600; }
        .p-badge { background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
        .p-section__body { padding: 24px; }
        .p-section--compact .p-section__body { padding: 16px 18px; }
        .compact-alert-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .compact-alert-item { border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 10px 12px; display: flex; gap: 10px; align-items: center; }
        .compact-alert-value { font-size: 1.1rem; font-weight: 700; color: #0f172a; line-height: 1; }
        .compact-alert-label { font-size: 0.75rem; color: #64748b; }
        .next-inspection-card {
          margin-top: 10px;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .next-inspection-card strong { color: #0f172a; font-size: 0.9rem; }
        .next-inspection-card p { margin: 2px 0 0 0; color: #475569; font-size: 0.8rem; }

        /* Diseño de Tablas */
        .p-table-wrap { border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
        .p-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
        .p-table th { background: #f1f5f9; color: #475569; padding: 12px 16px; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
        .p-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .p-table tr:last-child td { border-bottom: none; }
        .t-badge-lugar { background: #f8fafc; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
        .t-badge-lote { background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 4px; font-weight: 600; }

        /* Cuadrícula de Accesos Rápidos */
        .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .action-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: flex-start; }
        .action-card:hover { border-color: #3b82f6; box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.1); transform: translateY(-2px); }
        .action-icon-box { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .box-blue { background: #dbeafe; color: #1e40af; }
        .box-orange { background: #ffedd5; color: #9a3412; }
        .action-card h4 { margin: 0 0 6px 0; color: #0f172a; font-size: 1.05rem; font-weight: 600; }
        .action-card p { margin: 0 0 18px 0; color: #64748b; font-size: 0.85rem; line-height: 1.5; flex-grow: 1; }
        .action-btn { background: none; border: none; font-weight: 600; font-size: 0.88rem; padding: 0; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: gap 0.2s; }
        .btn-text-blue { color: #2563eb; }
        .btn-text-orange { color: #ea580c; }
        .action-card:hover .action-btn { gap: 8px; }

        /* Componentes de Carga / Alertas */
        .p-loading { padding: 16px; text-align: center; color: #64748b; font-size: 0.9rem; border: 1px dashed #cbd5e1; border-radius: 8px; }
        .p-alert { padding: 14px; border-radius: 8px; font-size: 0.88rem; font-weight: 500; text-align: center; }
        .p-alert--error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .p-alert--info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }

        @media (max-width: 768px) {
          .welcome-banner { flex-direction: column; align-items: flex-start; gap: 20px; padding: 24px; }
          .banner-content { max-width: 100%; }
          .banner-graphic-container { width: 120px; height: 120px; align-self: flex-end; }
          .primary-action-panel { flex-direction: column; align-items: flex-start; }
          .compact-alert-grid { grid-template-columns: 1fr; }
          .next-inspection-card { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  )
}

/* ── ICONOS OPTIMIZADOS REUTILIZABLES ── */
const S = { fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round', width:'22', height:'22' }
function IcoClipboard() { return <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IcoPlay() { return <svg viewBox="0 0 24 24" {...S}><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function IcoCheck() { return <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg> }
function IcoAlert() { return <svg viewBox="0 0 24 24" {...S}><path d="M12 9v4"/><path d="M12 16h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg> }
function IcoLote() { return <svg viewBox="0 0 24 24" {...S}><path d="M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7"/><path d="M3 7l9-4 9 4"/><path d="M12 3v18"/></svg> }
function IcoChart() { return <svg viewBox="0 0 24 24" {...S}><path d="M4 19h16"/><path d="M8 15v-4"/><path d="M12 15V9"/><path d="M16 15v-2"/></svg> }
function IcoClock() { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg> }