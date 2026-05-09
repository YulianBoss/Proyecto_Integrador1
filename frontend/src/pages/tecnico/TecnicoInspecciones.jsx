import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { tecnicoAPI } from '../../services/api'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const IcoX = () => <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck = () => <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg>
const IcoPlay = () => <svg viewBox="0 0 24 24" {...S}><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IcoClip = () => <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
const IcoEmpty = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>

const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}
const ESTADO_COLOR = {
  pendiente: { bg: '#fff8e1', color: '#b45309', border: '#fcd34d' },
  en_proceso: { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  completada: { bg: '#e8f5ee', color: '#2e7d52', border: '#6ee7b7' },
  cancelada: { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
}

function Badge({ estado }) {
  const s = ESTADO_COLOR[estado] || { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' }
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {ESTADO_LABEL[estado] || estado}
    </span>
  )
}

function Modal({ title, onClose, children, maxWidth = 820 }) {
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:'14px', width:'100%', maxWidth, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.125rem 1.5rem', borderBottom:'1px solid #e5e9f0', position:'sticky', top:0, background:'#fff', zIndex:2 }}>
          <h3 style={{ margin:0, fontSize:'1rem', color:'#1e2a4a', fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:4, display:'flex', borderRadius:6 }}>
            <IcoX />
          </button>
        </div>
        <div style={{ padding:'1.25rem 1.5rem 1.5rem' }}>{children}</div>
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

  const [modalRealizar, setModalRealizar] = useState(null)
  const [detalleRealizacion, setDetalleRealizacion] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [loteActivo, setLoteActivo] = useState(null)
  const [formLote, setFormLote] = useState({ total_plantas_inspeccionadas: '', observaciones_lote: '', plagas: [] })
  const [erroresLote, setErroresLote] = useState({})

  const [formCompletar, setFormCompletar] = useState({ observaciones_generales: '', recomendaciones: '', concepto_tecnico: '' })
  const [erroresCompletar, setErroresCompletar] = useState({})

  const toast_ = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  const normalizeSugerida = (item) => {
    if (typeof item === 'string') {
      return { plaga_id: null, plaga_nombre: item, plantas_afectadas: 0 }
    }
    return {
      plaga_id: item?.id ? Number(item.id) : null,
      plaga_nombre: item?.nombre || item?.plaga_nombre || '',
      plantas_afectadas: 0,
    }
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
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

  const cargarDetalleRealizacion = async (inspeccionId) => {
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
      const pendiente = (data?.lotes || []).find((l) => !l.evaluado) || data?.lotes?.[0] || null
      setLoteActivo(pendiente)
      if (pendiente) {
        const plagasBase = (data.plagas_sugeridas || []).map(normalizeSugerida)
        const plagasExistentes = pendiente.plagas?.length ? pendiente.plagas : plagasBase
        setFormLote({
          total_plantas_inspeccionadas: pendiente.total_plantas_inspeccionadas ? String(pendiente.total_plantas_inspeccionadas) : '',
          observaciones_lote: pendiente.observaciones_lote || '',
          plagas: plagasExistentes.map((p) => ({
            plaga_id: p.plaga_id ? Number(p.plaga_id) : null,
            plaga_nombre: p.plaga_nombre,
            plantas_afectadas: Number(p.plantas_afectadas || 0),
          })),
        })
      }
      setErroresLote({})
      setErroresCompletar({})
    } catch (e) {
      toast_(e?.response?.data?.message || 'No fue posible cargar el detalle de la inspeccion', 'error')
    } finally {
      setLoadingDetalle(false)
    }
  }

  const abrirRealizar = async (insp) => {
    setModalRealizar(insp)
    setDetalleRealizacion(null)
    setLoteActivo(null)
    await cargarDetalleRealizacion(insp.id)
  }

  const handleIniciar = async (insp) => {
    setProcesando(true)
    try {
      await tecnicoAPI.iniciar(insp.id)
      toast_('Inspeccion iniciada correctamente')
      cargar()
      abrirRealizar(insp)
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al iniciar la inspeccion', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const seleccionarLote = (lote) => {
    setLoteActivo(lote)
    const plagasBase = (detalleRealizacion?.plagas_sugeridas || []).map(normalizeSugerida)
    const plagasExistentes = lote.plagas?.length ? lote.plagas : plagasBase
    setFormLote({
      total_plantas_inspeccionadas: lote.total_plantas_inspeccionadas ? String(lote.total_plantas_inspeccionadas) : '',
      observaciones_lote: lote.observaciones_lote || '',
      plagas: plagasExistentes.map((p) => ({
        plaga_id: p.plaga_id ? Number(p.plaga_id) : null,
        plaga_nombre: p.plaga_nombre,
        plantas_afectadas: Number(p.plantas_afectadas || 0),
      })),
    })
    setErroresLote({})
  }

  const setPlagaValue = (idx, value) => {
    setFormLote((prev) => {
      const next = [...prev.plagas]
      next[idx] = { ...next[idx], plantas_afectadas: value === '' ? '' : Number(value) }
      return { ...prev, plagas: next }
    })
  }

  const validarLote = () => {
    const errs = {}
    const total = Number(formLote.total_plantas_inspeccionadas)
    if (!Number.isInteger(total) || total <= 0) {
      errs.total_plantas_inspeccionadas = 'Ingresa un total de plantas valido mayor a cero'
    }

    formLote.plagas.forEach((p) => {
      const afectadas = Number(p.plantas_afectadas)
      if (!Number.isInteger(afectadas) || afectadas < 0) {
        errs[`plaga_${p.plaga_nombre}`] = 'Debe ser un entero >= 0'
      } else if (Number.isInteger(total) && total > 0 && afectadas > total) {
        errs[`plaga_${p.plaga_nombre}`] = 'No puede superar el total inspeccionado'
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

      toast_(`Lote ${loteActivo.lote_codigo || loteActivo.lote_id} evaluado`) 
      await cargarDetalleRealizacion(detalleRealizacion.inspeccion.id)
      await cargar()
    } catch (e) {
      toast_(e?.response?.data?.message || 'No se pudo guardar la evaluacion del lote', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const completarInspeccion = async () => {
    if (!detalleRealizacion) return

    const errs = {}
    if (!formCompletar.concepto_tecnico.trim()) {
      errs.concepto_tecnico = 'El concepto tecnico es obligatorio'
    }
    setErroresCompletar(errs)
    if (Object.keys(errs).length) return

    setProcesando(true)
    try {
      const res = await tecnicoAPI.completar(detalleRealizacion.inspeccion.id, formCompletar)
      toast_(`Inspeccion completada. Riesgo: ${res?.data?.metricas?.nivel_riesgo || 'calculado'}`)
      setModalRealizar(null)
      setDetalleRealizacion(null)
      await cargar()
    } catch (e) {
      toast_(e?.response?.data?.message || 'No se pudo completar la inspeccion', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const resumenDetalle = useMemo(() => detalleRealizacion?.resumen || {
    total_lotes: 0,
    lotes_evaluados: 0,
    lotes_pendientes: 0,
    todos_evaluados: false,
  }, [detalleRealizacion])

  return (
    <section style={{ maxWidth: 980 }}>
      {toast && (
        <div style={{
          position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:500,
          background: toast.type === 'error' ? '#fef2f2' : '#e8f5ee',
          color: toast.type === 'error' ? '#b91c1c' : '#2e7d52',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
          borderRadius:12, padding:'0.75rem 1.25rem', fontSize:'0.85rem',
          boxShadow:'0 4px 20px rgba(0,0,0,0.12)', display:'flex', alignItems:'center', gap:'0.5rem',
        }}>
          {toast.type === 'error' ? <IcoX /> : <IcoCheck />} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:'1.5rem' }}>
        <h2 style={{ margin:'0 0 0.25rem', fontSize:'1.35rem', color:'#1e2a4a', fontWeight:800 }}>
          Mis Inspecciones
        </h2>
        <p style={{ margin:0, fontSize:'0.85rem', color:'#6b7280' }}>
          Flujo completo: consulta, evaluacion por lote y cierre final consolidado.
        </p>
      </div>

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {[['todas', 'Todas'], ['pendiente', 'Pendientes'], ['en_proceso', 'En proceso']].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFiltro(val)}
            style={{
              padding:'0.4rem 1rem', borderRadius:20, border:'1.5px solid',
              cursor:'pointer', fontSize:'0.8rem', fontWeight:600,
              background: filtro === val ? '#3b4fa8' : '#fff',
              color: filtro === val ? '#fff' : '#3b4fa8',
              borderColor: filtro === val ? '#3b4fa8' : '#c5cdf0',
            }}
          >
            {lbl}
          </button>
        ))}
        <button
          onClick={cargar}
          style={{ marginLeft:'auto', padding:'0.4rem 1rem', borderRadius:20, border:'1.5px solid #e5e9f0', background:'#fff', cursor:'pointer', fontSize:'0.8rem', color:'#6b7280', fontWeight:600 }}
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#9ca3af', fontSize:'0.9rem' }}>Cargando inspecciones...</div>
      ) : error ? (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'1.25rem', color:'#b91c1c', fontSize:'0.875rem' }}>{error}</div>
      ) : inspecciones.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem 1rem', color:'#9ca3af' }}>
          <IcoEmpty />
          <p style={{ marginTop:'0.75rem', fontSize:'0.9rem' }}>No tienes inspecciones asignadas en este momento.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {inspecciones.map((insp) => {
            const total = Number(insp.total_lotes || 0)
            const evaluados = Number(insp.lotes_evaluados || 0)
            return (
              <article key={insp.id} style={{
                background:'#fff', borderRadius:12, border:'1.5px solid #e5e9f0',
                padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem',
                boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, color:'#1e2a4a', fontSize:'0.95rem' }}>Inspeccion #{insp.id}</span>
                      <Badge estado={insp.estado} />
                    </div>
                    <div style={{ marginTop:'0.4rem', fontSize:'0.8rem', color:'#6b7280', display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
                      <span>Predio: {insp.predio_nombre || 'No registrado'}</span>
                      <span>Lugar: {insp.lugar_nombre || `#${insp.lugar_produccion_id}`}</span>
                      <span>Lote base: {insp.lote_codigo || `#${insp.lote_id}`}</span>
                      <span>Programada: {fmtFecha(insp.fecha_programada || insp.fecha_solicitud)}</span>
                    </div>
                    <div style={{ marginTop:'0.5rem', fontSize:'0.78rem', color:'#475569' }}>
                      Avance lotes: <strong>{evaluados}</strong>/{total || '0'} evaluados
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                    {insp.estado === 'pendiente' && (
                      <button
                        disabled={procesando}
                        onClick={() => handleIniciar(insp)}
                        style={{
                          display:'flex', alignItems:'center', gap:'0.4rem',
                          padding:'0.45rem 1rem', borderRadius:8, border:'none', cursor:'pointer',
                          background:'#3b4fa8', color:'#fff', fontSize:'0.8rem', fontWeight:600,
                          opacity: procesando ? 0.6 : 1,
                        }}
                      >
                        <IcoPlay /> Iniciar
                      </button>
                    )}

                    {(insp.estado === 'pendiente' || insp.estado === 'en_proceso') && (
                      <button
                        disabled={procesando}
                        onClick={() => abrirRealizar(insp)}
                        style={{
                          display:'flex', alignItems:'center', gap:'0.4rem',
                          padding:'0.45rem 1rem', borderRadius:8, border:'1.5px solid #c5cdf0', cursor:'pointer',
                          background:'#fff', color:'#3b4fa8', fontSize:'0.8rem', fontWeight:600,
                          opacity: procesando ? 0.6 : 1,
                        }}
                      >
                        <IcoClip /> Realizar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {modalRealizar && (
        <Modal title={`Realizar inspeccion #${modalRealizar.id}`} onClose={() => setModalRealizar(null)} maxWidth={980}>
          {loadingDetalle || !detalleRealizacion ? (
            <p style={{ margin:0, color:'#6b7280' }}>Cargando detalle...</p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'minmax(250px, 310px) 1fr', gap:'1rem' }}>
              <aside style={{ border:'1px solid #e5e9f0', borderRadius:12, padding:'0.9rem' }}>
                <h4 style={{ margin:'0 0 0.4rem', color:'#1e2a4a', fontSize:'0.95rem' }}>Lugar de produccion</h4>
                <p style={{ margin:'0 0 0.2rem', fontSize:'0.82rem', color:'#334155' }}><strong>{detalleRealizacion.lugar?.nombre || 'Sin nombre'}</strong></p>
                <p style={{ margin:'0 0 0.6rem', fontSize:'0.78rem', color:'#64748b' }}>
                  {detalleRealizacion.lugar?.municipio || 'Municipio'} - {detalleRealizacion.lugar?.departamento || 'Departamento'}
                </p>

                <div style={{ fontSize:'0.78rem', marginBottom:'0.6rem', color:'#334155' }}>
                  Evaluados: <strong>{resumenDetalle.lotes_evaluados}</strong>/{resumenDetalle.total_lotes}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                  {(detalleRealizacion.lotes || []).map((lote) => (
                    <button
                      key={lote.lote_id}
                      onClick={() => seleccionarLote(lote)}
                      style={{
                        textAlign:'left', padding:'0.55rem 0.65rem', borderRadius:8,
                        border: loteActivo?.lote_id === lote.lote_id ? '1.5px solid #3b4fa8' : '1px solid #e5e7eb',
                        background: lote.evaluado ? '#eefbf3' : '#fff', cursor:'pointer',
                      }}
                    >
                      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#1f2937' }}>
                        {lote.lote_codigo || `Lote #${lote.lote_id}`}
                      </div>
                      <div style={{ fontSize:'0.74rem', color:'#64748b' }}>{lote.predio_nombre || 'Predio no registrado'}</div>
                      <div style={{ fontSize:'0.72rem', color:lote.evaluado ? '#166534' : '#9a3412', marginTop:2 }}>
                        {lote.evaluado ? 'Evaluado' : 'Pendiente'}
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <section style={{ border:'1px solid #e5e9f0', borderRadius:12, padding:'1rem' }}>
                  <h4 style={{ margin:'0 0 0.65rem', color:'#1e2a4a', fontSize:'0.95rem' }}>
                    Registro por lote: {loteActivo?.lote_codigo || `#${loteActivo?.lote_id || ''}`}
                  </h4>

                  {!loteActivo ? (
                    <p style={{ margin:0, color:'#6b7280', fontSize:'0.84rem' }}>Selecciona un lote para evaluarlo.</p>
                  ) : (
                    <>
                      <div style={{ marginBottom:'0.8rem' }}>
                        <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.3rem' }}>
                          Total de plantas inspeccionadas *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formLote.total_plantas_inspeccionadas}
                          onChange={(e) => setFormLote((p) => ({ ...p, total_plantas_inspeccionadas: e.target.value }))}
                          style={{ width:'180px', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.45rem 0.6rem', fontSize:'0.84rem' }}
                        />
                        {erroresLote.total_plantas_inspeccionadas && (
                          <p style={{ margin:'0.25rem 0 0', fontSize:'0.73rem', color:'#dc2626' }}>{erroresLote.total_plantas_inspeccionadas}</p>
                        )}
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:'0.45rem', columnGap:'0.7rem', marginBottom:'0.75rem' }}>
                        <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151' }}>Plaga</div>
                        <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151' }}>Plantas afectadas</div>
                        {formLote.plagas.map((plaga, idx) => (
                          <Fragment key={`${plaga.plaga_nombre}-${idx}`}>
                            <div style={{ fontSize:'0.8rem', color:'#334155', display:'flex', alignItems:'center' }}>{plaga.plaga_nombre}</div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                value={plaga.plantas_afectadas}
                                onChange={(e) => setPlagaValue(idx, e.target.value)}
                                style={{ width:'120px', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.36rem 0.55rem', fontSize:'0.8rem' }}
                              />
                              {erroresLote[`plaga_${plaga.plaga_nombre}`] && (
                                <p style={{ margin:'0.2rem 0 0', fontSize:'0.72rem', color:'#dc2626' }}>{erroresLote[`plaga_${plaga.plaga_nombre}`]}</p>
                              )}
                            </div>
                          </Fragment>
                        ))}
                      </div>

                      <div style={{ marginBottom:'0.75rem' }}>
                        <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.3rem' }}>
                          Observaciones del lote (opcional)
                        </label>
                        <textarea
                          rows={3}
                          value={formLote.observaciones_lote}
                          onChange={(e) => setFormLote((p) => ({ ...p, observaciones_lote: e.target.value }))}
                          style={{ width:'100%', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.55rem 0.7rem', fontSize:'0.82rem', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
                        />
                      </div>

                      <button
                        disabled={procesando}
                        onClick={guardarLote}
                        style={{
                          display:'inline-flex', alignItems:'center', gap:'0.4rem',
                          padding:'0.45rem 1rem', borderRadius:8, border:'none', cursor:'pointer',
                          background:'#1d4ed8', color:'#fff', fontSize:'0.82rem', fontWeight:600,
                          opacity: procesando ? 0.6 : 1,
                        }}
                      >
                        <IcoCheck /> Guardar lote evaluado
                      </button>
                    </>
                  )}
                </section>

                <section style={{ border:'1px solid #e5e9f0', borderRadius:12, padding:'1rem', background: resumenDetalle.todos_evaluados ? '#f7fff8' : '#fff8f2' }}>
                  <h4 style={{ margin:'0 0 0.65rem', color:'#1e2a4a', fontSize:'0.95rem' }}>Finalizacion de la inspeccion</h4>
                  {!resumenDetalle.todos_evaluados && (
                    <p style={{ margin:'0 0 0.8rem', fontSize:'0.8rem', color:'#9a3412' }}>
                      Para finalizar debes evaluar todos los lotes activos ({resumenDetalle.lotes_pendientes} pendientes).
                    </p>
                  )}

                  <div style={{ display:'grid', gap:'0.75rem' }}>
                    <div>
                      <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.25rem' }}>Observaciones generales</label>
                      <textarea
                        rows={2}
                        value={formCompletar.observaciones_generales}
                        onChange={(e) => setFormCompletar((p) => ({ ...p, observaciones_generales: e.target.value }))}
                        style={{ width:'100%', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.5rem 0.65rem', fontSize:'0.82rem', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
                      />
                    </div>

                    <div>
                      <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.25rem' }}>Recomendaciones fitosanitarias</label>
                      <textarea
                        rows={2}
                        value={formCompletar.recomendaciones}
                        onChange={(e) => setFormCompletar((p) => ({ ...p, recomendaciones: e.target.value }))}
                        style={{ width:'100%', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.5rem 0.65rem', fontSize:'0.82rem', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
                      />
                    </div>

                    <div>
                      <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.25rem' }}>Concepto tecnico final *</label>
                      <input
                        value={formCompletar.concepto_tecnico}
                        onChange={(e) => setFormCompletar((p) => ({ ...p, concepto_tecnico: e.target.value }))}
                        placeholder="Ejemplo: Aprobado con control preventivo"
                        style={{ width:'100%', borderRadius:8, border:`1.5px solid ${erroresCompletar.concepto_tecnico ? '#dc2626' : '#d1d5db'}`, padding:'0.5rem 0.65rem', fontSize:'0.82rem', boxSizing:'border-box' }}
                      />
                      {erroresCompletar.concepto_tecnico && (
                        <p style={{ margin:'0.25rem 0 0', fontSize:'0.73rem', color:'#dc2626' }}>{erroresCompletar.concepto_tecnico}</p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop:'0.85rem', display:'flex', justifyContent:'flex-end' }}>
                    <button
                      disabled={procesando || !resumenDetalle.todos_evaluados}
                      onClick={completarInspeccion}
                      style={{
                        display:'inline-flex', alignItems:'center', gap:'0.4rem',
                        padding:'0.5rem 1.1rem', borderRadius:8, border:'none', cursor:'pointer',
                        background: resumenDetalle.todos_evaluados ? '#2e7d52' : '#9ca3af', color:'#fff', fontSize:'0.84rem', fontWeight:700,
                        opacity: procesando ? 0.6 : 1,
                      }}
                    >
                      <IcoClip /> Confirmar finalizacion
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </Modal>
      )}
    </section>
  )
}
