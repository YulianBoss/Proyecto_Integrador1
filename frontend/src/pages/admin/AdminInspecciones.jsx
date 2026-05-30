import { useState, useMemo, useEffect, useCallback } from 'react'
import { inspeccionesAPI, authAPI } from '../../services/api' // <- Importando tu API real
import './AdminMockPages.css'

export default function AdminInspecciones() {
  const [vistaActual, setVistaActual] = useState('inspecciones') // 'inspecciones' o 'tecnicos'
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  
  // Estados para datos reales de la API
  const [inspecciones, setInspecciones] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Estados para el Modal de Supervisión
  const [inspeccionSeleccionada, setInspeccionSeleccionada] = useState(null)
  const [detalleData, setDetalleData] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

// 1. Cargar datos desde la API (VERSIÓN DIAGNÓSTICO)
  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [inspRes, tecRes] = await Promise.all([
        inspeccionesAPI.getAll(),
        authAPI.getTecnicos()
      ])
      
      setInspecciones(inspRes.data || [])
      setTecnicos(tecRes.data || [])
    } catch (err) {
      console.error('Error capturado:', err);
      
      // Extraemos exactamente por qué falló
      const urlFallida = err.config?.url || 'URL desconocida';
      const status = err.response?.status || 'Network Error / Servidor Caído';
      const mensajeBackend = err.response?.data?.message || err.message || 'Sin mensaje';

      // Lo mostramos en la pantalla
      setError(`Fallo la petición a: ${urlFallida} | Código: ${status} | Razón: ${mensajeBackend}`);
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // 2. Filtrado inteligente de inspecciones
  const listaFiltrada = useMemo(() => {
    return inspecciones.filter(item => {
      const cumpleEstado = filtroEstado === 'todos' || item.estado === filtroEstado
      
      // Manejo seguro de valores nulos desde la BD
      const productor = item.productor_nombre || ''
      const predio = item.predio_nombre || ''
      const tecnico = item.tecnico_nombre || ''
      const idStr = String(item.id || '')

      const cumpleBusqueda = busqueda.trim() === '' ||
        productor.toLowerCase().includes(busqueda.toLowerCase()) ||
        predio.toLowerCase().includes(busqueda.toLowerCase()) ||
        idStr.toLowerCase().includes(busqueda.toLowerCase()) ||
        tecnico.toLowerCase().includes(busqueda.toLowerCase())
      
      return cumpleEstado && cumpleBusqueda
    })
  }, [inspecciones, filtroEstado, busqueda])

  // 3. Cálculo de Carga Operativa Dinámica de los Técnicos
  const planillaTecnicos = useMemo(() => {
    return tecnicos.map(tec => {
      // Buscamos todas las inspecciones asignadas a este técnico
      const susInsp = inspecciones.filter(i => i.tecnico_id === tec.id)
      
      const pendientes = susInsp.filter(i => i.estado === 'pendiente').length
      const en_proceso = susInsp.filter(i => i.estado === 'en_proceso').length
      const completadas = susInsp.filter(i => i.estado === 'completada').length
      const activas = pendientes + en_proceso

      // Semáforo de carga (Regla de negocio sencilla)
      let carga = 'Baja'
      if (activas >= 6) carga = 'Alta'
      else if (activas >= 3) carga = 'Moderada'

      return {
        ...tec,
        pendientes,
        en_proceso,
        completadas,
        activas,
        carga
      }
    })
  }, [tecnicos, inspecciones])

  // 4. Abrir Modal y cargar detalles de la base de datos
  const abrirSupervision = async (insp) => {
    setInspeccionSeleccionada(insp)
    setLoadingDetalle(true)
    setDetalleData(null)
    try {
      const res = await inspeccionesAPI.getById(insp.id)
      setDetalleData(res.data)
    } catch (err) {
      console.error('Error al obtener el detalle técnico:', err)
    } finally {
      setLoadingDetalle(false)
    }
  }

  // Helper para formato de fecha
  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO') : 'No agendada'

  return (
    <section className="mock-admin-page">
      <style>{`
        .ai-header-tabs { display: flex; gap: 12px; margin-top: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1px; }
        .ai-tab-btn { padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; font-weight: 600; font-size: 0.875rem; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .ai-tab-btn:hover { color: #1e293b; }
        .ai-tab-btn.active { color: #2563eb; border-color: #2563eb; }
        
        .ai-stats-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 1.25rem 0; }
        .ai-stat-mini { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; }
        .ai-stat-mini p { margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 500; }
        .ai-stat-mini h4 { margin: 4px 0 0 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; }
        
        .badge-load { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
        .badge-load.Alta { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-load.Moderada { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .badge-load.Baja { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

        .ai-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; backdrop-filter: blur(2px); }
        .ai-modal-box { background: #fff; width: 100%; max-width: 650px; border-radius: 14px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; border: 1px solid #e2e8f0; }
        .ai-modal-header { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .ai-modal-body { padding: 20px; overflow-y: auto; font-size: 0.85rem; line-height: 1.5; color: #334155; }
        .ai-modal-footer { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; }
        
        .ai-lock-banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 500; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .ai-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9; }
        .ai-detail-block { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
        .ai-detail-block strong { display: block; color: #0f172a; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.02em; }
        .ai-input-readonly { width: 100%; background: #f4f6f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-family: inherit; font-size: 0.85rem; color: #475569; cursor: not-allowed; }
      `}</style>

      <header>
        <h2>Supervisión General del Sistema</h2>
        <p>Módulo de auditoría fitosanitaria y seguimiento operativo de Asistentes Técnicos (Cumplimiento de Integridad RF-08).</p>
      </header>

      {/* Navegación por Pestañas */}
      <div className="ai-header-tabs">
        <button 
          className={`ai-tab-btn ${vistaActual === 'inspecciones' ? 'active' : ''}`}
          onClick={() => setVistaActual('inspecciones')}
        >
          🔍 Consulta de Inspecciones
        </button>
        <button 
          className={`ai-tab-btn ${vistaActual === 'tecnicos' ? 'active' : ''}`}
          onClick={() => setVistaActual('tecnicos')}
        >
          📋 Carga Operativa de Técnicos
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando datos operativos del sistema...</div>
      ) : error ? (
        <div style={{ padding: '20px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', marginTop: '20px' }}>{error}</div>
      ) : (
        <>
          {/* VISTA 1: CONSULTA GENERAL DE INSPECCIONES */}
          {vistaActual === 'inspecciones' && (
            <>
              <div className="ai-stats-summary">
                <div className="ai-stat-mini">
                  <p>Total Inspecciones</p>
                  <h4>{inspecciones.length} registros</h4>
                </div>
                <div className="ai-stat-mini">
                  <p>Históricas (Completadas)</p>
                  <h4>{inspecciones.filter(i => i.estado === 'completada').length}</h4>
                </div>
                <div className="ai-stat-mini">
                  <p>En Proceso / Pendientes</p>
                  <h4>{inspecciones.filter(i => i.estado !== 'completada').length}</h4>
                </div>
              </div>

              {/* Barra de Filtros */}
              <div className="mock-toolbar">
                <input 
                  type="text" 
                  placeholder="Buscar por Productor, Predio, Técnico o ID..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="todos">Todos los Estados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="completada">Completadas (Históricas)</option>
                </select>
              </div>

              {/* Tabla de Datos de Inspección */}
              <div className="mock-table-wrap">
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Productor</th>
                      <th>Predio / Lugar</th>
                      <th>Técnico Asignado</th>
                      <th>Programada</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaFiltrada.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          No se encontraron inspecciones con los filtros especificados.
                        </td>
                      </tr>
                    ) : (
                      listaFiltrada.map((item) => (
                        <tr key={item.id}>
                          <td><strong>#{item.id}</strong></td>
                          <td>{item.productor_nombre || 'Sin asignar'}</td>
                          <td>
                            <div style={{ fontWeight: '500' }}>{item.predio_nombre || 'Predio NA'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.lugar_nombre || 'Lugar NA'}</div>
                          </td>
                          <td>{item.tecnico_nombre || 'Sin asignar'}</td>
                          <td>{fmtFecha(item.fecha_programada || item.fecha_solicitud)}</td>
                          <td>
                            <span className={`mock-badge badge-${item.estado}`}>
                              {item.estado === 'completada' ? 'Completada' : item.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="mock-btn-action"
                              style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}
                              onClick={() => abrirSupervision(item)}
                            >
                              👁️ Supervisar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* VISTA 2: SEGUIMIENTO DE CARGA OPERATIVA */}
          {vistaActual === 'tecnicos' && (
            <>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>
                A continuación se presenta la distribución actual del personal en campo para fines de supervisión de carga administrativa.
              </p>
              <div className="mock-table-wrap">
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>Asistente Técnico</th>
                      <th>Documento/Email</th>
                      <th style={{ textAlign: 'center' }}>Pendientes</th>
                      <th style={{ textAlign: 'center' }}>En Proceso</th>
                      <th style={{ textAlign: 'center' }}>Históricas (Cerradas)</th>
                      <th style={{ textAlign: 'center' }}>Carga Operativa Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planillaTecnicos.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>No hay técnicos registrados.</td></tr>
                    ) : (
                      planillaTecnicos.map((tec) => (
                        <tr key={tec.id}>
                          <td><strong>{tec.nombre}</strong></td>
                          <td><code style={{fontSize: '0.75rem', color: '#64748b'}}>{tec.email}</code></td>
                          <td style={{ textAlign: 'center', color: tec.pendientes > 0 ? '#ea580c' : 'inherit' }}>
                            {tec.pendientes}
                          </td>
                          <td style={{ textAlign: 'center', color: tec.en_proceso > 0 ? '#2563eb' : 'inherit' }}>
                            {tec.en_proceso}
                          </td>
                          <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: '500' }}>
                            {tec.completadas} visitas
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge-load ${tec.carga}`}>{tec.carga}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* MODAL DETALLADO EXCLUSIVO DE SÓLO LECTURA (CUMPLIMIENTO RF-08) */}
      {inspeccionSeleccionada && (
        <div className="ai-modal-overlay">
          <div className="ai-modal-box">
            <div className="ai-modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>
                Detalle de Inspección Técnica #{inspeccionSeleccionada.id}
              </h3>
              <button 
                onClick={() => setInspeccionSeleccionada(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>
            
            <div className="ai-modal-body">
              {/* Banner de Restricción del Caso de Uso */}
              <div className="ai-lock-banner">
                <span>🔒</span>
                <div>
                  <strong>Modo de Supervisión Administrativa Restringido (RF-08)</strong>
                  <br />Usted no dispone de permisos para modificar datos técnicos, porcentajes calculados ni informes generados por los técnicos.
                </div>
              </div>

              {/* Bloque 1: Datos Generales */}
              <div className="ai-detail-grid">
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Productor</span>
                  <strong>{inspeccionSeleccionada.productor_nombre || 'No registrado'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Predio / Lugar</span>
                  <strong>{inspeccionSeleccionada.predio_nombre || 'No registrado'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Programada para</span>
                  <strong>{fmtFecha(inspeccionSeleccionada.fecha_programada || inspeccionSeleccionada.fecha_solicitud)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Inspector Encargado</span>
                  <strong>{inspeccionSeleccionada.tecnico_nombre || 'Sin Asignar'}</strong>
                </div>
              </div>

              {/* Bloque 2: Información Técnica de la Base de Datos */}
              {loadingDetalle ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Consultando reporte fitosanitario en la base de datos...</div>
              ) : inspeccionSeleccionada.estado === 'completada' ? (
                <>
                  <div className="ai-detail-block">
                    <label><strong>Concepto Técnico Emitido</strong></label>
                    <input type="text" className="ai-input-readonly" readOnly value={detalleData?.concepto_tecnico || 'Sin concepto técnico registrado.'} />
                  </div>

                  <div className="ai-detail-block">
                    <label><strong>Observaciones Generales de Campo</strong></label>
                    <textarea className="ai-input-readonly" style={{ height: '70px', resize: 'none' }} readOnly value={detalleData?.observaciones_generales || 'Ninguna observación.'} />
                  </div>

                  <div className="ai-detail-block">
                    <label><strong>Recomendaciones Fitosanitarias</strong></label>
                    <textarea className="ai-input-readonly" style={{ height: '70px', resize: 'none' }} readOnly value={detalleData?.recomendaciones || 'Ninguna recomendación.'} />
                  </div>
                  
                  {detalleData?.lotes?.length > 0 && (
                    <div className="ai-detail-block">
                      <label><strong>Lotes Evaluados Durante la Visita</strong></label>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#475569' }}>
                        {detalleData.lotes.map(lote => (
                          <li key={lote.id || lote.lote_id}>
                            Lote #{lote.lote_id} - Plantas evaluadas: {lote.total_plantas_inspeccionadas || 0}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                    Registro histórico protegido por auditoría.
                  </p>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  🕒 <strong>Esta inspección se encuentra {inspeccionSeleccionada.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem' }}>El Asistente Técnico asignado aún no ha emitido el informe fitosanitario de cierre.</p>
                </div>
              )}
            </div>

            <div className="ai-modal-footer">
              <button 
                onClick={() => setInspeccionSeleccionada(null)}
                className="mock-btn-action"
                style={{ background: '#1e293b', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', border: 'none' }}
              >
                Entendido (Cerrar)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}