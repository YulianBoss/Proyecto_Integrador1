import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { tecnicoAPI } from '../../services/api'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const ICO = { width:16, height:16, flexShrink:0 }
const IcoX = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><polyline points="20 6 9 17 4 12"/></svg>
const IcoPlay = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IcoClip = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
const IcoEmpty = () => <svg viewBox="0 0 24 24" {...S} style={{width:32,height:32,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
const IcoPlus = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoMinus = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoDoc = () => <svg viewBox="0 0 24 24" {...S} {...ICO}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>

const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

function Badge({ estado }) {
  return (
    <span className={`ti-badge ti-badge--${estado}`}>
      {ESTADO_LABEL[estado] || estado}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="ti-modal-overlay" onClick={onClose}>
      <div className="ti-modal" onClick={e => e.stopPropagation()}>
        <div className="ti-modal__header">
          <h3>{title}</h3>
          <button onClick={onClose} className="ti-modal__close"><IcoX /></button>
        </div>
        <div className="ti-modal__body">{children}</div>
      </div>
    </div>
  )
}

export default function TecnicoInspecciones() {
  const [inspecciones, setInspecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [procesando, setProcesando] = useState(false)

  const [modoVista, setModoVista] = useState('lotes') 
  const [modalRealizar, setModalRealizar] = useState(null)
  const [detalleRealizacion, setDetalleRealizacion] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [loteActivo, setLoteActivo] = useState(null)
  
  const [formLote, setFormLote] = useState({ total_plantas_inspeccionadas: 0, observaciones_lote: '', plagas: [] })
  const [erroresLote, setErroresLote] = useState({})

  const [formCompletar, setFormCompletar] = useState({ observaciones_generales: '', recomendaciones: '', concepto_tecnico: '' })
  const [erroresCompletar, setErroresCompletar] = useState({})

  const toast_ = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  
  const normalizeSugerida = (item) => {
    if (typeof item === 'string') return { plaga_id: null, plaga_nombre: item, plantas_afectadas: 0 }
    return { plaga_id: item?.id ? Number(item.id) : null, plaga_nombre: item?.nombre || item?.plaga_nombre || '', plantas_afectadas: 0 }
  }

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = filtro !== 'todas' ? { estado: filtro } : {}
      const res = await tecnicoAPI.misInspecciones(params)
      setInspecciones(res.data || [])
    } catch {
      setError('No se pudieron cargar las inspecciones. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  const cargarDetalleRealizacion = async (inspeccionId, autoSwitchToFinal = false) => {
    setLoadingDetalle(true)
    try {
      const res = await tecnicoAPI.detalleRealizacion(inspeccionId)
      const data = res.data
      setDetalleRealizacion(data)
      setFormCompletar({
        observaciones_generales: data?.inspeccion?.observaciones_generales || '',
        recomendaciones: data?.inspeccion?.recomendaciones || '',
        concepto_tecnico: data?.inspeccion?.concepto_tecnico || '',
      })
      
      const lotesData = data?.lotes || []
      const pendiente = lotesData.find((l) => !l.evaluado) || null
      
      setLoteActivo(pendiente || lotesData[0])
      
      if (pendiente) {
        configurarFormularioLote(pendiente, data.plagas_sugeridas)
        setModoVista('lotes')
      } else if (autoSwitchToFinal) {
        setModoVista('final')
      }

      setErroresLote({})
      setErroresCompletar({})
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al cargar detalle', 'error')
    } finally {
      setLoadingDetalle(false)
    }
  }

  const configurarFormularioLote = (lote, plagasSugeridasGlobales) => {
    const plagasBase = (plagasSugeridasGlobales || []).map(normalizeSugerida)
    const plagasExistentes = lote.plagas?.length ? lote.plagas : plagasBase
    setFormLote({
      total_plantas_inspeccionadas: lote.total_plantas_inspeccionadas ? Number(lote.total_plantas_inspeccionadas) : 0,
      observaciones_lote: lote.observaciones_lote || '',
      plagas: plagasExistentes.map((p) => ({
        plaga_id: p.plaga_id ? Number(p.plaga_id) : null,
        plaga_nombre: p.plaga_nombre,
        plantas_afectadas: Number(p.plantas_afectadas || 0),
      })),
    })
  }

  const abrirRealizar = async (insp) => {
    const abrirComoInforme = insp?.estado === 'completada'
    setModalRealizar(insp)
    setModoVista(abrirComoInforme ? 'final' : 'lotes')
    setDetalleRealizacion(null)
    setLoteActivo(null)
    await cargarDetalleRealizacion(insp.id, abrirComoInforme)
  }

  const handleIniciar = async (insp) => {
    setProcesando(true)
    try {
      await tecnicoAPI.iniciar(insp.id)
      toast_('Inspección iniciada correctamente')
      cargar()
      abrirRealizar(insp)
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al iniciar', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const seleccionarLote = (lote) => {
    if (detalleRealizacion?.inspeccion?.estado === 'completada') return
    setModoVista('lotes')
    setLoteActivo(lote)
    configurarFormularioLote(lote, detalleRealizacion?.plagas_sugeridas)
    setErroresLote({})
  }

  const cambiarTotalPlantas = (factor) => {
    if (loteActivo?.evaluado) return
    setFormLote(prev => ({ ...prev, total_plantas_inspeccionadas: Math.max(0, prev.total_plantas_inspeccionadas + factor) }))
  }

  const cambiarPlaga = (idx, factor) => {
    if (loteActivo?.evaluado) return
    setFormLote(prev => {
      const next = [...prev.plagas]
      const actual = Number(next[idx].plantas_afectadas) || 0
      next[idx].plantas_afectadas = Math.max(0, actual + factor)
      return { ...prev, plagas: next }
    })
  }

  const setPlagaManual = (idx, value) => {
    if (loteActivo?.evaluado) return
    setFormLote(prev => {
      const next = [...prev.plagas]
      next[idx].plantas_afectadas = value === '' ? '' : Number(value)
      return { ...prev, plagas: next }
    })
  }

  const validarLote = () => {
    const errs = {}
    const total = Number(formLote.total_plantas_inspeccionadas)
    if (!Number.isInteger(total) || total <= 0) {
      errs.total_plantas_inspeccionadas = 'Debe ser mayor a cero'
    }

    formLote.plagas.forEach((p) => {
      const afectadas = Number(p.plantas_afectadas)
      if (!Number.isInteger(afectadas) || afectadas < 0) {
        errs[`plaga_${p.plaga_nombre}`] = 'Inválido'
      } else if (Number.isInteger(total) && total > 0 && afectadas > total) {
        errs[`plaga_${p.plaga_nombre}`] = 'Supera el total'
      }
    })

    setErroresLote(errs)
    return Object.keys(errs).length === 0
  }

  const guardarLote = async () => {
    if (!detalleRealizacion || !loteActivo) return
    if (!validarLote()) return

    setProcesando(true)
    try {
      await tecnicoAPI.evaluarLote(detalleRealizacion.inspeccion.id, loteActivo.lote_id, {
        total_plantas_inspeccionadas: Number(formLote.total_plantas_inspeccionadas),
        observaciones_lote: formLote.observaciones_lote,
        plagas: formLote.plagas.map((p) => ({
          plaga_id: p.plaga_id,
          plaga_nombre: p.plaga_nombre,
          plantas_afectadas: Number(p.plantas_afectadas || 0),
        })),
      })
      toast_(`Lote evaluado`) 
      await cargarDetalleRealizacion(detalleRealizacion.inspeccion.id, true) 
      await cargar()
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al guardar lote', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const completarInspeccion = async () => {
    if (!detalleRealizacion) return
    const errs = {}
    if (!formCompletar.concepto_tecnico.trim()) {
      errs.concepto_tecnico = 'El concepto técnico es obligatorio'
    }
    setErroresCompletar(errs)
    if (Object.keys(errs).length) return

    setProcesando(true)
    try {
      const res = await tecnicoAPI.completar(detalleRealizacion.inspeccion.id, formCompletar)
      toast_(`Inspección completada. Riesgo: ${res?.data?.metricas?.nivel_riesgo || 'calculado'}`)
      setModalRealizar(null)
      await cargar()
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al completar', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const resumenDetalle = useMemo(() => detalleRealizacion?.resumen || { total_lotes: 0, lotes_evaluados: 0, todos_evaluados: false }, [detalleRealizacion])
  const esCompletada = detalleRealizacion?.inspeccion?.estado === 'completada'
  const informeFinal = detalleRealizacion?.informe || null
  const soloInforme = esCompletada && modalRealizar?.estado === 'completada'

  const metricasInforme = useMemo(() => {
    const lotesInforme = Array.isArray(informeFinal?.lotes) ? informeFinal.lotes : []
    const resumenPlagas = Array.isArray(informeFinal?.resumen_plagas) ? informeFinal.resumen_plagas : []

    const totalInspeccionadasLotes = lotesInforme.reduce(
      (acc, lote) => acc + (Number(lote?.total_plantas_inspeccionadas) || 0),
      0
    )

    const totalAfectadasResumen = resumenPlagas.reduce(
      (acc, p) => acc + (Number(p?.plantas_afectadas) || 0),
      0
    )

    const totalAfectadasLotes = lotesInforme.reduce(
      (acc, lote) => acc + (Array.isArray(lote?.plagas)
        ? lote.plagas.reduce((sub, p) => sub + (Number(p?.plantas_afectadas) || 0), 0)
        : 0),
      0
    )

    const total_plantas_inspeccionadas =
      Number(informeFinal?.total_plantas_inspeccionadas) ||
      totalInspeccionadasLotes ||
      0

    const total_plantas_afectadas =
      Number(informeFinal?.total_plantas_afectadas) ||
      totalAfectadasResumen ||
      totalAfectadasLotes ||
      0

    const porcentajeCalculado =
      total_plantas_inspeccionadas > 0
        ? Number(((total_plantas_afectadas / total_plantas_inspeccionadas) * 100).toFixed(2))
        : 0

    const porcentaje_infeccion_total =
      Number(informeFinal?.porcentaje_infeccion_total) || porcentajeCalculado

    return {
      total_plantas_inspeccionadas,
      total_plantas_afectadas,
      porcentaje_infeccion_total,
    }
  }, [informeFinal])

  const predioInforme =
    detalleRealizacion?.lugar?.predio_nombre ||
    detalleRealizacion?.inspeccion?.predio_nombre ||
    detalleRealizacion?.lugar?.predio?.nombre ||
    detalleRealizacion?.lugar?.vereda_direccion ||
    'No registrado'

  const totalAfectacionesLive = formLote.plagas.reduce((acc, p) => acc + (Number(p.plantas_afectadas) || 0), 0)

  // Respaldo para el nombre del lote
  const nombreLoteSeguro = loteActivo?.lote_codigo || loteActivo?.nombre || (loteActivo?.lote_id ? `Lote #${loteActivo.lote_id}` : 'Desconocido')
  const nombreLugarSeguro = detalleRealizacion?.lugar?.nombre || modalRealizar?.lugar_nombre || 'Lugar no registrado'

  return (
    <div className="ti-dashboard-area">
      {toast && (
        <div className={`ti-toast ti-toast--${toast.type}`}>
          {toast.type === 'error' ? <IcoX /> : <IcoCheck />} {toast.msg}
        </div>
      )}

      <div className="ti-header-block">
        <h2>Mis Inspecciones Asignadas</h2>
        <p>Flujo completo: consulta, evaluación por lugar de producción y cierre final consolidado.</p>
      </div>

      <div className="ti-toolbar">
        <div className="ti-filters">
          {[['todas', 'Todas'], ['pendiente', 'Pendientes'], ['en_proceso', 'En proceso'], ['completada', 'Completadas']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFiltro(val)} className={`ti-btn-filter ${filtro === val ? 'active' : ''}`}>{lbl}</button>
          ))}
        </div>
        <button onClick={cargar} className="ti-btn-outline">Actualizar</button>
      </div>

      <div className="ti-table-card">
        {loading ? (
          <div className="ti-empty-state">Cargando inspecciones...</div>
        ) : error ? (
          <div className="ti-empty-state error">{error}</div>
        ) : inspecciones.length === 0 ? (
          <div className="ti-empty-state"><IcoEmpty /> No tienes inspecciones en esta categoría.</div>
        ) : (
          <table className="ti-table">
            <thead>
              <tr>
                <th>ID</th><th>Estado</th><th>Predio</th><th>Lugar de producción</th><th>Cobertura</th><th>Programada</th><th>Avance</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map((insp) => (
                <tr key={insp.id}>
                  <td className="fw-bold">#{insp.id}</td>
                  <td><Badge estado={insp.estado} /></td>
                  <td>{insp.predio_nombre || 'No registrado'}</td>
                  <td>{insp.lugar_nombre || `Lugar #${insp.lugar_produccion_id}`}</td>
                  <td className="text-muted">{insp.total_lotes || 0} lotes</td>
                  <td>{fmtFecha(insp.fecha_programada || insp.fecha_solicitud)}</td>
                  <td className="text-muted">{insp.lotes_evaluados || 0}/{insp.total_lotes || 0}</td>
                  <td>
                    {insp.estado === 'pendiente' && (
                      <button disabled={procesando} onClick={() => handleIniciar(insp)} className="ti-btn-action green"><IcoPlay /> Iniciar</button>
                    )}
                    {['pendiente', 'en_proceso', 'completada'].includes(insp.estado) && (
                      <button disabled={procesando} onClick={() => abrirRealizar(insp)} className="ti-btn-action outline">
                        <IcoClip /> {insp.estado === 'completada' ? 'Ver informe' : 'Realizar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalRealizar && (
        <Modal title={`Inspección Técnica #${modalRealizar.id}`} onClose={() => setModalRealizar(null)}>
          {loadingDetalle || !detalleRealizacion ? (
            <div className="ti-empty-state">Cargando detalle de la inspección...</div>
          ) : (
            <div className={`ti-split-layout ${soloInforme ? 'solo-informe' : ''}`}>
              
              {!soloInforme && <aside className="ti-sidebar">
                <div className="ti-sidebar-header">
                  <h4>Lotes del lugar</h4>
                  <span className="ti-progreso-badge">{resumenDetalle.lotes_evaluados}/{resumenDetalle.total_lotes}</span>
                </div>
                
                <div className="ti-lotes-list">
                  {(detalleRealizacion.lotes || []).map((lote) => {
                    const nameFallback = lote.lote_codigo || lote.nombre || `Lote #${lote.lote_id}`;
                    return (
                      <button
                        key={lote.lote_id}
                        onClick={() => seleccionarLote(lote)}
                        className={`ti-lote-btn ${loteActivo?.lote_id === lote.lote_id && modoVista === 'lotes' ? 'active' : ''} ${lote.evaluado ? 'evaluado' : ''}`}
                      >
                        <div className="ti-lote-info">
                          <strong>{nameFallback}</strong>
                          <span>{lote.evaluado ? '✅ Evaluado' : '🔸 Pendiente'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="ti-sidebar-footer">
                  <button 
                    className={`ti-btn-informe ${modoVista === 'final' ? 'active' : ''}`}
                    disabled={!resumenDetalle.todos_evaluados && !esCompletada}
                    onClick={() => setModoVista('final')}
                  >
                    <IcoDoc /> Redactar Informe Final
                  </button>
                  {!resumenDetalle.todos_evaluados && !esCompletada && (
                    <p className="ti-help-text">Evalúa todos los lotes para habilitar el cierre.</p>
                  )}
                </div>
              </aside>}

              <main className={`ti-main-area ${soloInforme ? 'solo-informe' : ''}`}>
                
                {modoVista === 'lotes' && loteActivo && !soloInforme && (
                  <div className="ti-fade-in ti-form-container">
                    <div className="ti-main-header">
                      <h3>Inspección del lugar: {nombreLugarSeguro}</h3>
                      <p>Registrando evaluación del lote {nombreLoteSeguro} dentro del lugar inspeccionado.</p>
                    </div>

                    <div className="ti-card-info-lote">
                      <div className="ti-info-grid">
                        <div className="ti-info-item">
                          <label>Lugar de producción</label>
                          <span>{nombreLugarSeguro}</span>
                        </div>
                        <div className="ti-info-item">
                          <label>Productor</label>
                          <span>{detalleRealizacion?.inspeccion?.productor_nombre || 'No registrado'}</span>
                        </div>
                        <div className="ti-info-item">
                          <label>Cultivo</label>
                          <span>{loteActivo.especie_nombre || 'No asignado'}</span>
                        </div>
                        <div className="ti-info-item">
                          <label>Área del lote</label>
                          <span>{loteActivo.area_ha ? `${loteActivo.area_ha} ha` : 'No registrado'}</span>
                        </div>
                        <div className="ti-info-item">
                          <label>Ubicación</label>
                          <span>
                            {loteActivo.predio_municipio || detalleRealizacion?.lugar?.municipio || 'No registrado'}
                            {loteActivo.predio_departamento || detalleRealizacion?.lugar?.departamento
                              ? `, ${loteActivo.predio_departamento || detalleRealizacion?.lugar?.departamento}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {loteActivo.evaluado && !esCompletada ? (
                      <div className="ti-alert success">
                        <IcoCheck /> 
                        <div>
                          <strong>Lote Evaluado Exitosamente</strong>
                          <p>Los datos han sido guardados. Selecciona un lote pendiente en la lista para continuar.</p>
                        </div>
                      </div>
                    ) : (
                      <form className="ti-form-conteo">
                        
                        <div className="ti-card-stepper">
                          <div className="ti-stepper-info">
                            <label>1. Total de plantas inspeccionadas *</label>
                            <p>Muestra total del cultivo revisado.</p>
                            {erroresLote.total_plantas_inspeccionadas && <span className="ti-error-text">{erroresLote.total_plantas_inspeccionadas}</span>}
                          </div>
                          <div className="ti-stepper-controls">
                            <button type="button" onClick={() => cambiarTotalPlantas(-1)} disabled={loteActivo.evaluado}><IcoMinus/></button>
                            <input 
                              type="number" min="0" 
                              value={formLote.total_plantas_inspeccionadas} 
                              onChange={(e) => setFormLote(p => ({...p, total_plantas_inspeccionadas: Number(e.target.value)}))}
                              disabled={loteActivo.evaluado}
                            />
                            <button type="button" className="plus" onClick={() => cambiarTotalPlantas(1)} disabled={loteActivo.evaluado}><IcoPlus/></button>
                          </div>
                        </div>

                        <div className="ti-card-plagas">
                          <div className="ti-plagas-header">
                            <div>
                              <label>2. Registro de afectaciones</label>
                              <p>Conteo individual por plaga detectada.</p>
                            </div>
                            <span className={`ti-live-counter ${totalAfectacionesLive > formLote.total_plantas_inspeccionadas ? 'error' : ''}`}>
                              Afectadas: {totalAfectacionesLive}
                            </span>
                          </div>
                          
                          <div className="ti-plagas-grid">
                            {formLote.plagas.map((plaga, idx) => (
                              <div key={idx} className="ti-plaga-row">
                                <div className="ti-plaga-name">
                                  <span>{plaga.plaga_nombre}</span>
                                  {erroresLote[`plaga_${plaga.plaga_nombre}`] && <span className="ti-error-text">{erroresLote[`plaga_${plaga.plaga_nombre}`]}</span>}
                                </div>
                                <div className="ti-stepper-controls">
                                  <button type="button" onClick={() => cambiarPlaga(idx, -1)} disabled={loteActivo.evaluado}><IcoMinus/></button>
                                  <input 
                                    type="number" min="0" 
                                    value={plaga.plantas_afectadas} 
                                    onChange={(e) => setPlagaManual(idx, e.target.value)}
                                    disabled={loteActivo.evaluado}
                                  />
                                  <button type="button" className="plus" onClick={() => cambiarPlaga(idx, 1)} disabled={loteActivo.evaluado}><IcoPlus/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="ti-card-simple">
                          <label>3. Observaciones del lote (opcional)</label>
                          <textarea 
                            rows="2" 
                            placeholder="Anota particularidades de este cuadrante..."
                            value={formLote.observaciones_lote}
                            onChange={(e) => setFormLote(p => ({...p, observaciones_lote: e.target.value}))}
                            disabled={loteActivo.evaluado}
                          />
                        </div>

                        {!loteActivo.evaluado && (
                          <div className="ti-form-actions">
                            <button type="button" disabled={procesando} onClick={guardarLote} className="ti-btn-primary">
                              <IcoCheck /> Guardar Conteo del Lote
                            </button>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )}

                {modoVista === 'final' && (
                  <div className="ti-fade-in ti-form-container">
                    <div className="ti-main-header">
                      <h3>Informe Técnico de Inspección</h3>
                      <p>Consolida los hallazgos del lugar de producción e integra la conclusión final.</p>
                    </div>

                    {esCompletada ? (
                      <div className="ti-report-success">
                        <IcoCheck />
                        <h4>Informe Final Emitido</h4>
                        <div className="ti-report-meta">
                          <div><strong>Inspección</strong><span>#{detalleRealizacion?.inspeccion?.id || '-'}</span></div>
                          <div><strong>Lugar</strong><span>{nombreLugarSeguro}</span></div>
                          <div><strong>Predio</strong><span>{predioInforme}</span></div>
                          <div><strong>Fecha de cierre</strong><span>{fmtFecha(detalleRealizacion?.inspeccion?.fecha_cierre)}</span></div>
                          <div><strong>Lotes evaluados</strong><span>{resumenDetalle.lotes_evaluados}/{resumenDetalle.total_lotes}</span></div>
                          <div><strong>Nivel de riesgo</strong><span className="ti-risk-badge">{informeFinal?.nivel_riesgo || 'N/A'}</span></div>
                        </div>

                        <div className="ti-report-grid">
                          <div className="full-w"><strong>Concepto técnico</strong>{detalleRealizacion?.inspeccion?.concepto_tecnico || 'Sin concepto registrado'}</div>
                          <div><strong>Plantas inspeccionadas</strong>{metricasInforme.total_plantas_inspeccionadas}</div>
                          <div><strong>Plantas afectadas</strong>{metricasInforme.total_plantas_afectadas}</div>
                          <div><strong>Infección total</strong>{metricasInforme.porcentaje_infeccion_total}%</div>
                          <div className="full-w"><strong>Observaciones generales</strong>{detalleRealizacion?.inspeccion?.observaciones_generales || 'Sin observaciones'}</div>
                          <div className="full-w"><strong>Recomendaciones</strong>{detalleRealizacion?.inspeccion?.recomendaciones || 'Sin recomendaciones'}</div>
                        </div>

                        <div className="ti-report-block">
                          <h5>Resumen de plagas detectadas</h5>
                          {!informeFinal?.resumen_plagas?.length ? (
                            <p className="ti-report-empty">No se reportaron plagas en esta inspección.</p>
                          ) : (
                            <ul className="ti-report-list">
                              {informeFinal.resumen_plagas.map((plaga) => (
                                <li key={plaga.plaga_nombre}>
                                  <span>{plaga.plaga_nombre}</span>
                                  <span>{plaga.plantas_afectadas} plantas · {plaga.incidencia_porcentaje}%</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="ti-report-block">
                          <h5>Detalle por lote</h5>
                          {!informeFinal?.lotes?.length ? (
                            <p className="ti-report-empty">No hay detalle de lotes en el informe.</p>
                          ) : (
                            <div className="ti-report-lotes">
                              {informeFinal.lotes.map((l) => (
                                <article key={l.lote_id} className="ti-report-lote-card">
                                  <header>
                                    <strong>{l.lote_codigo || `Lote #${l.lote_id}`}</strong>
                                    <span>{l.total_plantas_inspeccionadas || 0} plantas inspeccionadas</span>
                                  </header>
                                  {!l.plagas?.length ? (
                                    <p className="ti-report-empty">Sin plagas registradas en este lote.</p>
                                  ) : (
                                    <ul>
                                      {l.plagas.map((p) => (
                                        <li key={`${l.lote_id}-${p.plaga_nombre}`}>
                                          {p.plaga_nombre}: {p.plantas_afectadas} plantas ({p.incidencia_porcentaje}%)
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form className="ti-form-final">
                        <div className="ti-input-group">
                          <label>Observaciones Generales</label>
                          <textarea rows="3" value={formCompletar.observaciones_generales} onChange={e => setFormCompletar(p => ({...p, observaciones_generales: e.target.value}))} />
                        </div>
                        <div className="ti-input-group">
                          <label>Recomendaciones Fitosanitarias</label>
                          <textarea rows="3" value={formCompletar.recomendaciones} onChange={e => setFormCompletar(p => ({...p, recomendaciones: e.target.value}))} />
                        </div>
                        <div className="ti-input-group">
                          <label>Concepto Técnico Final *</label>
                          <input type="text" className={erroresCompletar.concepto_tecnico ? 'error' : ''} placeholder="Ej. Aprobado con prevención" value={formCompletar.concepto_tecnico} onChange={e => setFormCompletar(p => ({...p, concepto_tecnico: e.target.value}))} />
                          {erroresCompletar.concepto_tecnico && <span className="ti-error-text">{erroresCompletar.concepto_tecnico}</span>}
                        </div>
                        <div className="ti-form-actions">
                          <button type="button" disabled={procesando} onClick={completarInspeccion} className="ti-btn-primary large">
                            <IcoDoc /> Emitir y Cerrar Inspección
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

              </main>
            </div>
          )}
        </Modal>
      )}

{/* ── ESTILOS  (TAMAÑOS Y BOTONES CORREGIDOS) ── */}
      <style>{`
        .ti-dashboard-area { max-width: 1200px; margin: 0 auto; padding: 24px; font-family: system-ui, sans-serif; color: #334155; }
        
        .ti-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; display: flex; gap: 10px; align-items: center; font-weight: 500; z-index: 9999; animation: slideUp 0.3s ease; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .ti-toast--ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .ti-toast--error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .ti-header-block { margin-bottom: 24px; }
        .ti-header-block h2 { margin: 0 0 4px 0; font-size: 1.5rem; color: #0f172a; }
        .ti-header-block p { margin: 0; color: #64748b; }
        .ti-toolbar { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .ti-filters { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
        .ti-btn-filter { background: transparent; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .ti-btn-filter.active { background: white; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .ti-btn-outline { background: white; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
        .ti-btn-outline:hover { border-color: #94a3b8; color: #0f172a; }
        
        .ti-table-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .ti-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
        .ti-table th { background: #f8fafc; padding: 12px 16px; color: #475569; border-bottom: 1px solid #e2e8f0; }
        .ti-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
        .ti-table tr:last-child td { border-bottom: none; }
        .fw-bold { font-weight: 600; color: #0f172a; }
        .text-muted { color: #64748b; }
        .ti-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .ti-badge--pendiente { background: #fff7ed; color: #ea580c; }
        .ti-badge--en_proceso { background: #eff6ff; color: #2563eb; }
        .ti-badge--completada { background: #f0fdf4; color: #16a34a; }
        .ti-btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: opacity 0.15s, filter 0.15s; }
        .ti-btn-action svg { width: 14px; height: 14px; flex-shrink: 0; }
        .ti-btn-action:hover { filter: brightness(0.93); }
        .ti-btn-action.green { background: #22c55e; color: white; }
        .ti-btn-action.outline { background: white; border-color: #cbd5e1; color: #334155; }

        .ti-empty-state { padding: 40px; text-align: center; color: #64748b; font-weight: 500; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .ti-empty-state.error { color: #dc2626; background: #fef2f2; }

        /* MODAL CORREGIDO: MENOR TAMAÑO */
        .ti-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .ti-modal { background: #f8fafc; width: 100%; max-width: 900px; height: 88vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.25); }
        .ti-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: white; border-bottom: 1px solid #e2e8f0; }
        .ti-modal__header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
        .ti-modal__close { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.15s; }
        .ti-modal__close:hover { background: #f1f5f9; color: #0f172a; }
        .ti-modal__close svg { width: 18px; height: 18px; }
        .ti-modal__body { flex: 1; display: flex; min-height: 0; overflow: hidden; }

        .ti-split-layout { display: flex; width: 100%; height: 100%; min-height: 0; }
        .ti-split-layout.solo-informe { display: flex; justify-content: center; }
        
        .ti-sidebar { width: 280px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .ti-sidebar-header { padding: 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .ti-sidebar-header h4 { margin: 0; font-size: 0.95rem; color: #0f172a; }
        .ti-progreso-badge { background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
        
        .ti-lotes-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .ti-lote-btn { width: 100%; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .ti-lote-btn:hover { border-color: #cbd5e1; }
        .ti-lote-btn.active { background: #eff6ff; border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
        .ti-lote-btn.evaluado { opacity: 0.7; border-color: #bbf7d0; background: #f0fdf4; }
        .ti-lote-info { display: flex; justify-content: space-between; align-items: center; }
        .ti-lote-info strong { color: #0f172a; font-size: 0.9rem; }
        .ti-lote-info span { font-size: 0.7rem; font-weight: 600; color: #64748b; }
        
        .ti-sidebar-footer { padding: 16px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
        .ti-btn-informe { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-weight: 600; color: #334155; display: flex; justify-content: center; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
        .ti-btn-informe svg { width: 16px; height: 16px; flex-shrink: 0; }
        .ti-btn-informe:not(:disabled):hover { border-color: #3b82f6; color: #2563eb; }
        .ti-btn-informe.active { background: #2563eb; color: white; border-color: #2563eb; }
        .ti-btn-informe:disabled { opacity: 0.5; cursor: not-allowed; }
        .ti-help-text { margin: 6px 0 0 0; font-size: 0.7rem; color: #64748b; text-align: center; }

        .ti-main-area { flex: 1; min-height: 0; padding: 24px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; align-items: center; }
        .ti-main-area.solo-informe { align-items: center; }
        .ti-form-container { width: 100%; max-width: 560px; }
        .ti-main-area.solo-informe .ti-form-container { max-width: 760px; margin: 0 auto; }
        .ti-fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        
        .ti-main-header { margin-bottom: 20px; }
        .ti-main-header h3 { margin: 0 0 4px 0; font-size: 1.25rem; color: #0f172a; }
        .ti-main-header p { margin: 0; color: #64748b; font-size: 0.9rem;}

        .ti-card-info-lote { background: white; border: 1px solid #dbeafe; padding: 16px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); margin-bottom: 16px; }
        .ti-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
        .ti-info-item { display: flex; flex-direction: column; }
        .ti-info-item label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #0284c7; letter-spacing: 0.5px; margin-bottom: 4px; }
        .ti-info-item span { font-size: 0.95rem; color: #0f172a; font-weight: 500; }

        .ti-form-conteo, .ti-form-final { display: flex; flex-direction: column; gap: 16px; }
        .ti-card-stepper, .ti-card-plagas, .ti-card-simple { background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .ti-card-stepper { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        
        .ti-stepper-info label { font-size: 0.95rem; font-weight: 600; color: #0f172a; }
        .ti-stepper-info p { margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b; }
        
        /* BOTONES +/- CORREGIDOS Y ESTRICTAMENTE PEQUEÑOS */
        .ti-stepper-controls { display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; padding: 4px; border-radius: 8px; border: 1px solid #cbd5e1; height: 42px; width: max-content; max-width: 150px; box-sizing: border-box; gap: 6px; }
        .ti-stepper-controls button { width: 32px !important; height: 32px !important; min-width: 32px !important; flex: 0 0 32px !important; border-radius: 6px; border: none; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; box-shadow: 0 1px 2px rgba(0,0,0,0.05); padding: 0; }
        .ti-stepper-controls button svg { width: 16px; height: 16px; }
        .ti-stepper-controls button.plus { background: #e0f2fe; color: #0284c7; }
        
        /* INPUT NUMÉRICO LIMPIO SIN FLECHAS Y TAMAÑO FIJO */
        .ti-stepper-controls input { width: 45px !important; min-width: 45px !important; flex: 0 0 45px !important; text-align: center; font-size: 1.1rem; font-weight: 700; border: none; background: transparent; outline: none; color: #0f172a; padding: 0; margin: 0; }
        .ti-stepper-controls input[type="number"]::-webkit-outer-spin-button,
        .ti-stepper-controls input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .ti-stepper-controls input[type="number"] { -moz-appearance: textfield; }
        .ti-stepper-controls button:disabled, .ti-stepper-controls input:disabled { opacity: 0.5; cursor: not-allowed; }

        .ti-plagas-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
        .ti-plagas-header label { font-size: 0.95rem; font-weight: 600; color: #0f172a; }
        .ti-plagas-header p { margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b; }
        .ti-live-counter { font-size: 0.8rem; font-weight: 600; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 12px; }
        .ti-live-counter.error { background: #fef2f2; color: #dc2626; }
        
        .ti-plagas-grid { display: flex; flex-direction: column; gap: 8px; }
        .ti-plaga-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .ti-plaga-name { display: flex; flex-direction: column; font-weight: 500; color: #334155; font-size: 0.9rem; }
        .ti-error-text { font-size: 0.75rem; color: #dc2626; font-weight: 600; margin-top: 2px; }

        .ti-card-simple label { display: block; font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; color: #0f172a; }
        .ti-card-simple textarea, .ti-input-group textarea, .ti-input-group input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 0.9rem; outline: none; transition: border 0.2s; box-sizing: border-box; resize: vertical; }
        .ti-card-simple textarea:focus, .ti-input-group textarea:focus, .ti-input-group input:focus { border-color: #3b82f6; }
        .ti-input-group input.error { border-color: #dc2626; }

        .ti-form-actions { display: flex; justify-content: flex-end; padding-top: 8px; }
        .ti-btn-primary { background: #22c55e; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; width: auto; justify-content: center; }
        .ti-btn-primary svg { width: 16px; height: 16px; flex-shrink: 0; }
        .ti-btn-primary:hover { background: #16a34a; }
        .ti-btn-primary.large { background: #2563eb; }
        .ti-btn-primary.large:hover { background: #1d4ed8; }
        .ti-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .ti-alert.success { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; display: flex; gap: 12px; color: #15803d; align-items: flex-start; }
        .ti-alert.success svg { width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
        .ti-alert.success strong { font-size: 1rem; display: block; margin-bottom: 2px; }
        .ti-alert.success p { margin: 0; font-size: 0.85rem; color: #166534; }

        .ti-report-success { background: white; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; text-align: left; width: 100%; }
        .ti-report-success svg { width: 36px; height: 36px; color: #22c55e; margin-bottom: 12px; }
        .ti-report-success h4 { margin: 0 0 16px 0; font-size: 1.15rem; color: #0f172a; text-align: center; }
        .ti-report-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
        .ti-report-meta > div { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff; }
        .ti-report-meta strong { display: block; color: #64748b; font-size: 0.72rem; text-transform: uppercase; margin-bottom: 4px; }
        .ti-report-meta span { color: #0f172a; font-weight: 600; font-size: 0.86rem; }
        .ti-risk-badge { text-transform: capitalize; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; border-radius: 999px; padding: 3px 8px; display: inline-block; }
        .ti-report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: left; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9; margin-bottom: 14px; }
        .ti-report-grid .full-w { grid-column: span 2; }
        .ti-report-grid strong { display: block; color: #64748b; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 4px; }
        .ti-report-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff; }
        .ti-report-block h5 { margin: 0 0 8px 0; font-size: 0.92rem; color: #0f172a; }
        .ti-report-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .ti-report-list li { display: flex; justify-content: space-between; gap: 10px; border: 1px solid #f1f5f9; background: #f8fafc; border-radius: 6px; padding: 8px 10px; font-size: 0.82rem; color: #334155; }
        .ti-report-lotes { display: grid; gap: 10px; }
        .ti-report-lote-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
        .ti-report-lote-card header { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .ti-report-lote-card header strong { color: #0f172a; font-size: 0.86rem; }
        .ti-report-lote-card header span { color: #64748b; font-size: 0.76rem; }
        .ti-report-lote-card ul { margin: 0; padding-left: 18px; color: #334155; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px; }
        .ti-report-empty { margin: 0; font-size: 0.8rem; color: #64748b; }

        .ti-input-group { display: flex; flex-direction: column; gap: 6px; }
        .ti-input-group label { font-weight: 600; font-size: 0.9rem; color: #0f172a; }

        @media (max-width: 900px) {
          .ti-modal { max-width: 96vw; height: 90vh; }
          .ti-main-area.solo-informe .ti-form-container { max-width: 100%; }
          .ti-report-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 620px) {
          .ti-modal-overlay { padding: 8px; }
          .ti-modal { height: 94vh; }
          .ti-main-area { padding: 14px; }
          .ti-report-meta { grid-template-columns: 1fr; }
          .ti-report-grid { grid-template-columns: 1fr; }
          .ti-report-grid .full-w { grid-column: span 1; }
        }
      `}</style>
    </div>
  )
}